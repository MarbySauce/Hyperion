#include <iostream>
#include <vector>
#include <napi.h>
#include "centroid.h"


// Global variables
bool windowGenerated = false;
bool cameraConnected = false;
char* pMem;
int memID;
std::vector<unsigned char> buffer(768*768*4);
Centroid Img(0, 0);
Napi::FunctionReference eventEmitter;

// End global variables



// Send message to JavaScript with calculated centers and computation time
void sendCentroids() {
	Napi::Env env = eventEmitter.Env(); // Napi local environment
	
	// Package centers and compute time into an array
	// 0 -> CCL centers, 1 -> hybrid centers, 2 -> computation time
	Napi::Array centroidResults = Napi::Array::New(env, 3);

	// First add the centroids
	for (int centroidMethod = 0; centroidMethod < 2; centroidMethod++) {
		// Create a temporary array to fill with each method's calculated centroids
		Napi::Array centroidList = Napi::Array::New(env);
		int centroidCounter = 0; // To keep track of how many center were found
		for (int center = 0; center < Img.Centroids[centroidMethod].width(); center++) {
			// Make sure x value is not 0 (i.e. make sure it's a real centroid)
			if (Img.Centroids(centroidMethod, center, 0) > 0) {
				Napi::Array spot = Napi::Array::New(env, 2); // centroid's coordinates

				float xCenter = Img.Centroids(centroidMethod, center, 0);
				float yCenter = Img.Centroids(centroidMethod, center, 1);
				spot.Set(Napi::Number::New(env, 0), Napi::Number::New(env, xCenter));
				spot.Set(Napi::Number::New(env, 1), Napi::Number::New(env, yCenter));

				// Add spot to centroidList
				centroidList.Set(centroidCounter, spot);
				centroidCounter++;
			}
		}
		// Add the temporary centroidList to the array we're sending
		centroidResults.Set(centroidMethod, centroidList);
	}

	// Now add the computation time
	centroidResults.Set(2, Img.computationTime); 

	Napi::Array dumb = Napi::Array::New(env, 3);
	dumb.Set(Napi::Number::New(env, 0), Napi::Number::New(env, 20));
	dumb.Set(Napi::Number::New(env, 1), Napi::Number::New(env, 20));
	dumb.Set(Napi::Number::New(env, 2), Napi::Number::New(env, 20));

	// Send message to JavaScript with packaged results
	eventEmitter.Call(
		{
			Napi::String::New(env, "new-image"),
			centroidResults
		}
	);
}