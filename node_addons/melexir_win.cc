#ifndef UNICODE
#define UNICODE
#endif

#include <iostream>
#include <string>
#include <napi.h>
#include "timer.h"
#include "mlxr.h"

using namespace std;

extern "C" {
    void setoptions_(char optString[], long int strLength);
    void checkoption_(char key[], int* iopt, double* fopt, bool* qopt, long int keyLength);
    //void image2data_(double fimage[][50], int* ldf, int* nrow, int* ncol, double dat[], int* ldd);
    void image2data_(double fimage[], int* ldf, int* nrow, int* ncol, double dat[], int* ldd);
    void melexirdll_(double dat[], double sigma[], double fmap[], double base[], double datainv[], int* nr, int* nt);
}

double image[1024][1024];
int image_width = 1024;
int image_height = 1024;
// Initialize image with 1 transition
void InitImage(const Napi::CallbackInfo& info) {
    Timer sim_time;
    srand(time(NULL)); // Setting up random number generator

    float const pi = 3.14159265358979;

    // First make sure image is blank
    for (int Y = 0; Y < image_height; Y++) {
        for (int X = 0; X < image_width; X++) {
            image[Y][X] = 0;
        }
    }

    // Then add electrons
    int radius = 150;
    int center_x = image_width / 2; int center_y = image_height / 2;
    long int e_count = 100000;
    long int total_count = 0;

    while (total_count < e_count) {
        // Using the physics def. of spherical coords
		float phi = 2 * pi * ((rand() % 1000) / 1000.0);		 // (0,2pi)
		float costheta = 2.0 * ((rand() % 1000) / 1000.0) - 1.0; // (-1,1)
		float theta = acos(costheta);
		int X = round(center_x + radius * sin(theta) * cos(phi)); // Converting to Cartesian coords
		int Y = round(center_y + radius * cos(theta));
        image[Y][X]++;
        total_count++;
    }

    sim_time.endPrint("Time to simulate");

    /*// Print the image
    for (int Y = 0; Y < image_height; Y++) {
        for (int X = 0; X < image_width; X++) {
            cout << image[Y][X] << " ";
        }
        cout << endl;
    }
    cout << endl;*/

    // Use image from file instead
    //getImageFromArr(image);
}

void Test(const Napi::CallbackInfo& info) {
    Timer overall_time;
    char string1[] = "-LP2 -MC0 -IX512 -IZ512";

    setoptions_(string1, sizeof(string1));
    // Need to end the string with a null character since Fortran doesn't (but C++ requires it)
    string1[sizeof(string1)-1] = '\0';

    // Get the number of Legendre components (will fill iopt)
    char key[]  = "L"; int iopt; double fopt; bool qopt;
    int nl; int nl_even; int nl_odd; // Total Legendre components, and even and odd portions
    checkoption_(key, &iopt, &fopt, &qopt, sizeof(key));
    // Figure out even and odd components (logic taken from melexir.f90 ln83)
    if (iopt >= 10) {
        // => Two digits, must have even and odd components
        nl_even = iopt / 10; // First digit is even components
        nl_odd = iopt % 10; // Second digit is odd components
    } else {
        // Only one digit => only even components
        nl_even = iopt;
        nl_odd = 0;
    }
    nl_even = nl_even / 2 + 1; // Get count of just even components (including zero)
    nl_odd = (nl_odd + 1) / 2; // Get count of just odd components (0.5 rounds down to 0 bc it's an int)
    nl = nl_even + nl_odd;

    Timer time;
    double* flat_image = new double[image_height*image_width];
    // Flatten into a column-major 1D array
    for (int row = 0; row < image_height; row++) {
        for (int col = 0; col < image_width; col++) {
            flat_image[image_width*row + col] = image[col][row]; // Need to double check this
        }
    } 
    time.endPrint("Time to flatten");

    // Prepare image for MELEXIR
    int nrow = image_height;
    int ncol = image_width;
    int ldd = pow(max(nrow, ncol),2); // Largest possible value for length of contracted data (Comes from PrepareVMI3.f90 ln104)
    double* dat = new double[ldd];
    //image2data_(image, &nrow, &nrow, &ncol, dat, &ldd);
    image2data_(flat_image, &nrow, &nrow, &ncol, dat, &ldd);

    // Run MELEXIR
    //int nt = nrow * ncol;
    int nt = nrow * nl;
    // Allocate memory for input/output arrays
    double* dat2 = new double[nt]; // Legendre-projected data
    double* sigma = new double[nt]; // Residuals
    double* fmap = new double[nt]; // Will be hidden map
    double* base = new double[nt]; // Will be best fit to data
    double* datainv = new double[nt]; // map from DAVIS inverse
    // Fill in dat2 and sigma
    // Doing this the gross way so I can understand what's going on. Can rewrite later
    // First fill l=0 for both
    for (int i = 0; i < nrow; i++) {
        dat2[i] = dat[i]; // First column goes to dat2
        sigma[i] = dat[nrow + i]; // Second column goes to sigma
    }
    // Then fill l=2 (why does he do it out of order?)
    for (int i = 0; i < nrow; i++) {
        dat2[nrow + i] = dat[4 * nrow + i]; // Fifth column goes to dat2
        sigma[nrow + i] = dat[5 * nrow + i]; // Sixth column goes to sigma
    }
    // Lastly fill in l=1
    /*for (int i = 0; i < nrow; i++) {
        dat2[2 * nrow + i] = dat[2 * nrow + i]; // Third column goes to dat2
        sigma[2 * nrow + i] = dat[3 * nrow + i]; // Fourth column goes to sigma
    }*/
    
    melexirdll_(dat2, sigma, fmap, base, datainv, &nrow, &nt);
    // sigma will be the spectrum
    // dat will be the residuals (idk why he swaps it)

    overall_time.endPrint("Time to complete");

}


// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Fill exports object with addon functions
    exports["initImage"] = Napi::Function::New(env, InitImage);
    exports["test"] = Napi::Function::New(env, Test);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);