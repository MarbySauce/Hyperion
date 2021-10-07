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
	
	// Package average intensities to return
	// each element is {xCenter, yCenter, averageIntensity}
	Napi::Array centroidResults = Napi::Array::New(env, 1);

	int regionCounter = 0;
	for (int i = 0; i < 1500; i++) {
		if (Img.Centroids(0, i, 0) > 0) {
			Napi::Array tempArray = Napi::Array::New(env, 3);
			tempArray.Set(Napi::Number::New(env, 0), Napi::Number::New(env, Img.Centroids(0, i, 0)));
			tempArray.Set(Napi::Number::New(env, 1), Napi::Number::New(env, Img.Centroids(0, i, 1)));
			tempArray.Set(Napi::Number::New(env, 2), Napi::Number::New(env, Img.Centroids(0, i, 2)));
			centroidResults.Set(Napi::Number::New(env, regionCounter), tempArray);
			regionCounter++;
		}
	}

	// Send message to JavaScript with packaged results
	eventEmitter.Call(
		{
			Napi::String::New(env, "new-image"),
			centroidResults
		}
	);
}