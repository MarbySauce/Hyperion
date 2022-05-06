#ifndef UNICODE
#define UNICODE
#endif

#include <iostream>
#include <string>
#include <napi.h>
#include <math.h>
#include "timer.h"
#include "mlxr.h"

using namespace std;

/* 
	Currently cannot get MELEXIR on Mac (in talks with Bernhard Dick to resolve)
	In the meantime, going to create fake functions, similar to camera_mac.cc
*/

extern "C" {
    void setoptions_(char optString[], long int strLength);
    void checkoption_(char key[], int* iopt, double* fopt, bool* qopt, long int keyLength);
    void image2data_(double fimage[], int* ldf, int* nrow, int* ncol, double dat[], int* ldd);
    void melexirdll_(double dat[], double sigma[], double fmap[], double base[], double datainv[], int* nr, int* nt);
}

// Generate a simulated image and return it as a 2D array
Napi::Array GenerateImage(const Napi::CallbackInfo& info) {
    Timer gen_time;
    Napi::Env env = info.Env(); // Napi local environment
    srand(time(NULL)); // Setting up random number generator
    double const pi = 3.14159265358979;

    // For now, just generate a 1024 x 1024 image with three transitions, slightly off center
    int const image_width = 1024;
    int const image_height = 1024;
    int center_x = 525;
    int center_y = 517;

    // First we'll generate the image in a C++ array, then convert to a Napi array
    int image[image_height][image_width];

    // Make sure image is blank
    for (int Y = 0; Y < image_height; Y++) {
        for (int X = 0; X < image_width; X++) {
            image[Y][X] = 0;
        }
    }

    // Then add electrons
    long int e_count = 100000;
    for (long int total_count = 0; total_count < e_count; total_count++) {
        int radius = ((rand() % 3) + 1) * 50; // Radius will either be 50, 100, or 150px
        // Using the physics def. of spherical coords
		float phi = 2 * pi * ((rand() % 1000) / 1000.0);		 // (0,2pi)
		float costheta = 2.0 * ((rand() % 1000) / 1000.0) - 1.0; // (-1,1)
		float theta = acos(costheta);
		int X = round(center_x + radius * sin(theta) * cos(phi)); // Converting to Cartesian coords
		int Y = round(center_y + radius * cos(theta));
        image[Y][X]++;
    }

    // Convert image to a Napi array
    Napi::Array napi_image = Napi::Array::New(env);
    for (int Y = 0; Y < image_height; Y++) {
        Napi::Array row = Napi::Array::New(env, image_width);
        for (int X = 0; X < image_width; X++) {
            row.Set(X, Napi::Number::New(env, image[Y][X])); // Fill in Napi element with image element
        }
        napi_image.Set(Y, row); // Append the empty row to image
    }

    gen_time.endPrint("Time to generate image");

    // Return to JS
    return napi_image;
}

// Take an image from JS and run Melexir 
// Parameter should be the image (as a 2D array)
// Returns PES
Napi::Object Process(const Napi::CallbackInfo& info) {
    Timer overall_time;
    Napi::Env env = info.Env(); // Napi local environment
    
    // Get image from JS call
    Napi::Array napi_image = info[0].As<Napi::Array>();
    // Get size of image
    int image_height = (int)napi_image.Length();
    // Have to first create the first row as an array to get its length
    Napi::Array row0 = napi_image.Get(Napi::Number::New(env,0)).As<Napi::Array>();
    int image_width = (int)row0.Length();

	// MELEXIR stuff would go here...

	// BS values
	int nrow = max(image_height, image_width) / 2;
	int nl = 2;
	int nt = nrow * nl;
	double* dat = new double[nt]; // Legendre-projected data
    double* sigma = new double[nt]; // Residuals
	for (int i = 0; i < nt; i++) {
		dat[i] = 0;
		sigma[i] = 0;
	}

    // Set up arrays to return
    Napi::Object results = Napi::Object::New(env);
    Napi::Array spectrum = Napi::Array::New(env); // Worked up spectrum
    Napi::Array residuals = Napi::Array::New(env); // Residuals of fit to data
    Napi::Array radii = Napi::Array::New(env); // Row of radial elements
    // Fill radial elements and append to Napi arrays
    for (int i = 0; i < nrow; i++) {
        radii.Set(i, Napi::Number::New(env, 0.5 + i));
    }
    spectrum.Set(Napi::Number::New(env, 0), radii); residuals.Set(Napi::Number::New(env, 0), radii); 
    // Add row for each Legendre component to each Napi array
    for (int lp = 0; lp < nl; lp++) {
        Napi::Array spectrum_temp_row = Napi::Array::New(env);
        Napi::Array residuals_temp_row = Napi::Array::New(env);
        for (int i = 0; i < nrow; i++) {
            spectrum_temp_row.Set(i, Napi::Number::New(env, sigma[lp * nrow + i]));
            residuals_temp_row.Set(i, Napi::Number::New(env, dat[lp * nrow + i]));
        }
        spectrum.Set(lp + 1, spectrum_temp_row);
        residuals.Set(lp + 1, residuals_temp_row);
    }
    // Add result arrays to object
    results["spectrum"] = spectrum;
    results["residuals"] = residuals;

    overall_time.endPrint("Time to complete");

    return results;
}

void Test(const Napi::CallbackInfo& info) {
	char string1[] = "Hello -LP2";

    setoptions_(string1, sizeof(string1));
    // Need to end the string with a null character since Fortran doesn't (but C++ requires it)
    string1[sizeof(string1)-1] = '\0';

	cout << string1 << endl;
}


// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Fill exports object with addon functions
    exports["generateImage"] = Napi::Function::New(env, GenerateImage);
    exports["process"] = Napi::Function::New(env, Process);
	exports["test"] = Napi::Function::New(env, Test);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);