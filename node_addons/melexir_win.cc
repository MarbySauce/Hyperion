#ifndef UNICODE
#define UNICODE
#endif

#include <iostream>
#include <string>
#include <napi.h>
#include "mlxr.h"

using namespace std;

extern "C" {
    void setoptions_(char optString[], long int strLength);
    void checkoption_(char key[], int* iopt, double* fopt, bool* qopt, long int keyLength);
    void image2data_(double fimage[][50], int* ldf, int* nrow, int* ncol, double dat[], int* ldd);
    void melexirdll_(double dat[], double sigma[], double fmap[], double base[], double datainv[], int* nr, int* nt);
}

double image[50][50];
// Initialize image with 1 transition
void InitImage(const Napi::CallbackInfo& info) {
    /*srand(time(NULL)); // Setting up random number generator

    float const pi = 3.14159265358979;

    int image_width = 50;
    int image_height = 50;

    // First make sure image is blank
    for (int Y = 0; Y < image_height; Y++) {
        for (int X = 0; X < image_width; X++) {
            image[Y][X] = 0;
        }
    }

    // Then add electrons
    int radius = 15;
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
    }*/

    /*// Print the image
    for (int Y = 0; Y < image_height; Y++) {
        for (int X = 0; X < image_width; X++) {
            cout << image[Y][X] << " ";
        }
        cout << endl;
    }
    cout << endl;*/

    // Use image from file instead
    getImageFromArr(image);
}

void Test(const Napi::CallbackInfo& info) {
    char string1[] = "test_image.dat -LP2";

    setoptions_(string1, sizeof(string1));
    // Need to end the string with a null character since Fortran doesn't (but C++ requires it)
    string1[sizeof(string1)-1] = '\0';

    // Get the number of Legendre components (will be i + 1)
    char k[]  = "L"; int i = 1; double f; bool q;
    checkoption_(k, &i, &f, &q, sizeof(k));
    int nl = i;
    cout << "nl: " << nl << endl;

    // Prepare image for MELEXIR
    int nrow = 50;
    int ncol = 50;
    int ldd = pow(max(nrow, ncol),2); // Comes from PrepareVMI3.f90
    double* dat = new double[ldd];
    image2data_(image, &nrow, &nrow, &ncol, dat, &ldd);

    cout << "pixel before: " << image[10][25] << endl;

    // Run MELEXIR
    //int nt = nrow * ncol;
    int nt = nrow * nl;
    cout << nt << ", " << nrow << ", " << ncol << endl;
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

    cout << "pixel after: " << image[10][25] << endl;
    
    for (int i = 0; i < nrow; i++) {
        cout << sigma[i] << ",";
    }
    cout << endl << endl;
    for (int i = nrow; i < 2*nrow; i++) {
        cout << sigma[i] << ",";
    }
    cout << endl << endl;
    for (int i = 2*nrow; i < 3*nrow; i++) {
        cout << sigma[i] << ",";
    }
    cout << endl << endl;
    cout << "Done" << endl;

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