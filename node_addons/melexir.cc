#ifndef UNICODE
#define UNICODE
#endif

#include <stdio.h>
#include <string>
#include <math.h>
#include <napi.h>
#include "timer.h"

using namespace std;

extern "C" {
    void setoptions_(char optString[], long int strLength);
    void checkoption_(char key[], int* iopt, double* fopt, bool* qopt, long int keyLength);
    void image2data_(double fimage[], int* ldf, int* nrow, int* ncol, double dat[], int* ldd);
    void melexirdll_(double dat[], double sigma[], double fmap[], double base[], double datainv[], int* nr, int* nt);
}

// Hard coded to have 1 hidden map and get only even Legendre components up to L=2
// I fucking tried to make it customizable but its literally impossible
Napi::Object Process(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Get image from JS call
	Napi::Array napi_image = info[0].As<Napi::Array>();
	// Get size of image
	int image_height = (int)napi_image.Length();
	// Have to first create the first row as an array to get its length
	Napi::Array row0 = napi_image.Get(Napi::Number::New(env,0)).As<Napi::Array>();
	int image_width = (int)row0.Length();

	// Convert Napi image into a column-major 1D array
	// Napi has a hard time with 2D arrays, so you have to unpack each row
	//  in order to get the elements of the image
	double* flat_image = new double[image_height*image_width];
	for (int row = 0; row < image_height; row++) {
		Napi::Array napi_row = napi_image.Get(Napi::Number::New(env, row)).As<Napi::Array>(); // Unpack the row
		for (int col = 0; col < image_width; col++) {
			flat_image[image_height*col + row] = (double)napi_row.Get(Napi::Number::New(env, col)).ToNumber().DoubleValue();
		}
	} 


	// Give options string to Melexir
	char options_string[] = "-H1 -LP2 -L2 "; // Should be "-H1 -LP2 -L2 " - anything else might not work correctly!
	//						Note: You might be able to change the amount of hidden maps - I never tested that part
	setoptions_(options_string, sizeof(options_string));

	int nl = 2; // Total number of Legendre componenets
	int nl_even = 2; // Number of even Legendre components
	int nl_odd = 0; // Number of odd Legendre components

	// Prepare image for MELEXIR
	int nrow = image_height;
	int ncol = image_width;
	int ldd = 2*nrow*nl; //pow(max(nrow, ncol),2); // Largest possible value for length of contracted data (Comes from PrepareVMI3.f90 ln104)
	double* lp_image = new double[ldd]; // Will be Legendre projection of image
	image2data_(flat_image, &nrow, &nrow, &ncol, lp_image, &ldd);

	// Run MELEXIR
	int nt = nrow * nl;
	// Allocate memory for input/output arrays
	double* dat = new double[nt]; // Legendre-projected data
	double* sigma = new double[nt]; // Residuals
	double* fmap = new double[nt]; // Will be hidden map
	double* base = new double[nt]; // Will be best fit to data
	double* datainv = new double[nt]; // map from DAVIS inverse
	// Fill in dat and sigma
	// lp_image is filled with the Legendre projected components
	// Each set of 2 columns in lp_image will be (data, st.dev) for each l value in order (l = 0, 1, 2...)
	// However, MELEXIR needs the data with even l first, then odd l (l = 0, 2, 4... 1, 3, 5...)
	// Data goes to dat and st.dev goes to sigma
	// First fill l=0 for both
	for (int i = 0; i < nrow; i++) {
		dat[i] = lp_image[i]; // First column goes to dat
		sigma[i] = lp_image[nrow + i]; // Second column goes to sigma
	}
	// Then fill l=2 (why does he do it out of order?)
	for (int i = 0; i < nrow; i++) {
		dat[nrow + i] = lp_image[4 * nrow + i]; // Fifth column goes to dat
		sigma[nrow + i] = lp_image[5 * nrow + i]; // Sixth column goes to sigma
	}

	melexirdll_(dat, sigma, fmap, base, datainv, &nrow, &nt);
	// sigma will be the spectrum
	// dat will be the residuals (idk why he swaps it)

	// Set up arrays to return
	Napi::Object results = Napi::Object::New(env);
	Napi::Array spectrum = Napi::Array::New(env); // Worked up spectrum
	Napi::Array residuals = Napi::Array::New(env); // Residuals of fit to data
	Napi::Array best_fit = Napi::Array::New(env); // Best fit to data
	Napi::Array radii = Napi::Array::New(env); // Row of radial elements
	// Fill radial elements and append to Napi arrays
	for (int i = 0; i < nrow; i++) {
		radii.Set(i, Napi::Number::New(env, 0.5 + i));
	}
	spectrum.Set(Napi::Number::New(env, 0), radii); 
	residuals.Set(Napi::Number::New(env, 0), radii);
	best_fit.Set(Napi::Number::New(env, 0), radii); 
	// Add row for each Legendre component to each Napi array
	for (int lp = 0; lp < nl; lp++) {
		Napi::Array spectrum_temp_row = Napi::Array::New(env);
		Napi::Array residuals_temp_row = Napi::Array::New(env);
		Napi::Array best_fit_temp_row = Napi::Array::New(env);
		for (int i = 0; i < nrow; i++) {
			spectrum_temp_row.Set(i, Napi::Number::New(env, sigma[lp * nrow + i]));
			residuals_temp_row.Set(i, Napi::Number::New(env, dat[lp * nrow + i]));
			best_fit_temp_row.Set(i, Napi::Number::New(env, base[lp * nrow + i]));
		}
		spectrum.Set(lp + 1, spectrum_temp_row);
		residuals.Set(lp + 1, residuals_temp_row);
		best_fit.Set(lp + 1, best_fit_temp_row);
	}
	// Add result arrays to object
	results["spectrum"] = spectrum;
	results["residuals"] = residuals;
	results["best_fit"] = best_fit;

	return results;
}


// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Fill exports object with addon functions
    exports["process"] = Napi::Function::New(env, Process);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);