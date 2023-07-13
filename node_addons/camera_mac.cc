#include "camera.h"
#include "centroid.h"
#include <napi.h>

// Global variables
Camera camera; 							// Contains important info about the camera
Centroid img; 							// Variables and functions for centroiding image
Napi::FunctionReference eventEmitter; 	// Used to quickly send image and centroids to JS side

// Mac specific global variables
int simImageWidth = 1024;				// Width of simulated image
int simImageHeight = 768;				// Height of simulated image
Timer triggerDelay; 					// Used for simulating 20Hz rep rate
std::vector<char> simulatedImage; 		// Stand-in for image memory
int repCount = 0; 						// Keep track of # of repetitions
int simulationCount = 0;				// With above, used to check for skipped frames
bool isIROn = false;					// Add in ability to make "IR On" images different
bool useLED = true;						// Whether to add in intensity to simulate IR LED

// Constants
float const pi = 3.14159265358979;
// End of global variables


/* 
	PascalCase functions are Napi functions that can be called from JavaScript
		These functions are camelCase on JavaScript side (i.e. camera.getInfo() in InvisibleWindow.js)
	camelCase functions are C++ functions that can only be called from C++
*/ 

// 
// C++ functions
//

float gauss(int i, float center, float width)
{
	return sqrt(255) * exp(-pow(i - center, 2) / width);
}

void simulateImage(std::vector<char> &simImage, unsigned int randSeed) {
	srand(randSeed); // Setting up random number generator

	// Simulated values
	int numberOfSpots = (rand() % 10) + 55;
	//std::vector<float> Radii = {30, 50, 90, 120, 170};
	std::vector<float> Radii = {50, 90, 170, 300};
	std::vector<float> PeakHeights = {2, 4, 3, 1}; // Sum = 10 

	// First clear the image (i.e. fill with 0's)
	// 		(Unnecessary if adding noise)
	//std::fill(std::begin(simImage), std::end(simImage), 0);

	// Get center of image
	//int imageCenterX = camera.width / 2;
	//int imageCenterY = camera.height / 2;
	int imageCenterX = img.xLowerBound + (img.xUpperBound - img.xLowerBound) / 2;
	int imageCenterY = img.yLowerBound + (img.yUpperBound - img.yLowerBound) / 2;


	// Add noise to the image
	for (int i = 0; i < camera.imageLength;  i++) {
		int noise = rand() % 5;
		simImage[i] = (char)noise;
	}

	// Add in intensity to simulate IR LED
	if (isIROn && useLED) {
		for (int Y = img.LEDyLowerBound; Y < img.LEDyUpperBound; Y++) {
			for (int X = img.LEDxLowerBound; X < img.LEDxUpperBound; X++) {
				int intensity = rand() % 40 + 80;
				simImage[camera.width * Y + X] = intensity;
			}
		}
	}

	if (isIROn) {
		isIROn = false;
		Radii = {50, 90, 120, 170, 300}; 
		PeakHeights = {2, 3, 2, 2, 1}; // Sum = 10
		//return;
	} else {
		isIROn = true;
	}

	int PeakHeightSum = 0;
	for (int i = 0; i < PeakHeights.size(); i++) {
		PeakHeightSum += PeakHeights[i];
	}

	// Add spots
	int spotNumber = 0;
	while (spotNumber < numberOfSpots)
	{
		int radiusIndex = rand() % Radii.size();
		float radius = Radii[radiusIndex];
		if (((rand() % 1000) / 1000.0) > (PeakHeights[radiusIndex] / PeakHeightSum)) {
			continue;
		}
		
		// Using the physics def. of spherical coords
		float phi = 2 * pi * ((rand() % 1000) / 1000.0);		 // (0,2pi)
		float costheta = 2.0 * ((rand() % 1000) / 1000.0) - 1.0; // (-1,1)
		float theta = acos(costheta);
		float centerX = imageCenterX + radius * sin(theta) * cos(phi); // Converting to Cartesian coords
		float centerY = imageCenterY + radius * cos(theta);
		float widthX = (rand() % 50 + 100) / 10.0; // Randomly chooses widths btw 10.0 and 15.0 pixels (closer to real spot sizes)
		float widthY = (rand() % 50 + 100) / 10.0;
		float percentIntensity = (rand() % 60 + 0) / 100.0; // Choosing intensity btw 50% and 110%

		// Add the spot to the image
		for (int Y = centerY - 8; Y < centerY + 9; Y++)
		{
			for (int X = centerX - 8; X < centerX + 9; X++)
			{
				int intensity = round(gauss(Y, centerY, widthY) * gauss(X, centerX, widthX) * percentIntensity);
				int currentIntensity = (unsigned char)simImage[camera.width * Y + X];
				currentIntensity += intensity;
				if (currentIntensity > 255)
				{
					currentIntensity = 255; // Cuts off intensity at 255
				}
				simImage[camera.width * Y + X] = currentIntensity;
			}
		}

		spotNumber++;
		
	}
}



//
// Napi functions
//

// Pretend to create a WinAPI window to receive windows messages 
// Returns true
Napi::Boolean CreateWinAPIWindow(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	camera.windowGenerated = true;

	return Napi::Boolean::New(env, camera.windowGenerated);
}

// Pretend to connect to the camera
// Returns true
Napi::Boolean Connect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	camera.connected = true;

	return Napi::Boolean::New(env, camera.connected);
}

// Pretend to get camera info
// Returns object with information
Napi::Object GetInfo(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	Napi::Object information = Napi::Object::New(env); // Object to be returned

	// Update camera information in C++ object
	camera.infoReceived = true;
	camera.width = simImageWidth;
	camera.height = simImageHeight;
	camera.imageLength = camera.width * camera.height;
	// Initialize area of interest as entire image
	img.xLowerBound = 0;
	img.xUpperBound = camera.width;
	img.yLowerBound = 0;
	img.yUpperBound = camera.height;
	
	// Fill out with information
	// NOTE TO MARTY: Might want to change these to be snake_case to be consistent with JS side
	information["info_received"] = Napi::Boolean::New(env, true);
	information["model"] = Napi::String::New(env, "Simulation");
	information["id"] = Napi::Number::New(env, 0);
	information["color_mode"] = Napi::Number::New(env, 1);
	information["width"] = Napi::Number::New(env, camera.width);
	information["height"] = Napi::Number::New(env, camera.height);
	
	return information;
}

// Pretend to apply camera settings
// Initialize image for centroiding
// Get pMem;
// Returns true unless camera was not "initialized"
Napi::Boolean ApplySettings(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Initialize image array for centroiding
	img.Image.assign(camera.width, camera.height);
	img.RegionImage.assign(camera.width, camera.height);
	img.RegionVector.assign(1500, 3);
	img.COMs.assign(1500, 4);

	// Check to make sure camera was initialized first
	if (!camera.connected) {
		std::cout << "Camera was not initialized!" << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Create and fill array for simulated image
	simulatedImage.assign(camera.imageLength, 0);

	// Get image memory address
	camera.pMem = &simulatedImage[0];

	return Napi::Boolean::New(env, true);
}

// Set the area of interest for centroiding
// Arguments are (AoI-Width, AoI-Height, left-offset, top-offset)
// If only two arguments passed, assumed to be (AoI-Width, AoI-Height)
void SetAoI(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	int argLength = info.Length(); // Number of arguments passed

	// Values to be used to calculate AoI parameters
	int AoIWidth;
	int AoIHeight;
	int leftOffset;
	int topOffset;

	// Check that the arguments passed are correct
	if (!(argLength == 2 || argLength == 4)) {
		Napi::Error::New(env, "setAoI requires 2 or 4 arguments").
			ThrowAsJavaScriptException();
		return;
	}

	if (argLength == 2) {
		// Check that the arguments are integers
		if (!info[0].IsNumber() || !info[1].IsNumber()) {
			Napi::Error::New(env, "setAoI arguments must be integers").
				ThrowAsJavaScriptException();
			return;
		}
		// Only 2 arguments passed, assume offsets to be 0
		leftOffset = 0;
		topOffset = 0;
		// Get AoI values
		AoIWidth = reinterpret_cast<int>(info[0].ToNumber().Int32Value());
		AoIHeight = reinterpret_cast<int>(info[1].ToNumber().Int32Value());
	}

	if (argLength == 4) {
		// Check that the arguments are integers
		if (!info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber()) {
			Napi::Error::New(env, "setAoI arguments must be integers").
				ThrowAsJavaScriptException();
			return;
		}
		// Get AoI values
		AoIWidth = reinterpret_cast<int>(info[0].ToNumber().Int32Value());
		AoIHeight = reinterpret_cast<int>(info[1].ToNumber().Int32Value());
		// Get offset values
		leftOffset = reinterpret_cast<int>(info[2].ToNumber().Int32Value());
		topOffset = reinterpret_cast<int>(info[3].ToNumber().Int32Value());
	}

	// Make sure sizes + offsets don't exceed image size
	if (leftOffset + AoIWidth > camera.width || topOffset + AoIHeight > camera.height) {
		Napi::Error::New(env, "AoI exceeds image size").
			ThrowAsJavaScriptException();
		return;
	}

	// Calculate AoI parameters
	img.xLowerBound = leftOffset;
	img.xUpperBound = leftOffset + AoIWidth;
	img.yLowerBound = topOffset;
	img.yUpperBound = topOffset + AoIHeight;

	return;
}

// Set the LED area to check if the IR LED is on
// Arguments are (x-start, x-end, y-start, y-end)
void SetLEDArea(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	int argLength = info.Length(); // Number of arguments passed

	// Check that the arguments passed are correct
	if (argLength != 4) {
		Napi::Error::New(env, "setLEDArea requires 4 arguments").
			ThrowAsJavaScriptException();
		return;
	}

	// Check that the arguments are integers
	if (!info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber()) {
		Napi::Error::New(env, "setLEDArea arguments must be integers").
			ThrowAsJavaScriptException();
		return;
	}
	// Get area values
	img.LEDxLowerBound = reinterpret_cast<int>(info[0].ToNumber().Int32Value());
	img.LEDxUpperBound = reinterpret_cast<int>(info[1].ToNumber().Int32Value());
	img.LEDyLowerBound = reinterpret_cast<int>(info[2].ToNumber().Int32Value());
	img.LEDyUpperBound = reinterpret_cast<int>(info[3].ToNumber().Int32Value());

	return;
}

// Set the Noise area to check if the IR LED is on
// Arguments are (x-start, x-end, y-start, y-end)
void SetNoiseArea(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	int argLength = info.Length(); // Number of arguments passed

	// Check that the arguments passed are correct
	if (argLength != 4) {
		Napi::Error::New(env, "setNoiseArea requires 4 arguments").
			ThrowAsJavaScriptException();
		return;
	}

	// Check that the arguments are integers
	if (!info[0].IsNumber() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsNumber()) {
		Napi::Error::New(env, "setNoiseArea arguments must be integers").
			ThrowAsJavaScriptException();
		return;
	}
	// Get area values
	img.NoisexLowerBound = reinterpret_cast<int>(info[0].ToNumber().Int32Value());
	img.NoisexUpperBound = reinterpret_cast<int>(info[1].ToNumber().Int32Value());
	img.NoiseyLowerBound = reinterpret_cast<int>(info[2].ToNumber().Int32Value());
	img.NoiseyUpperBound = reinterpret_cast<int>(info[3].ToNumber().Int32Value());

	return;
}

// Set the camera trigger
// Returns true
Napi::Boolean SetTrigger(Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Return true
	return Napi::Boolean::New(env, true);
}

// Set the camera exposure
// Returns true
Napi::Boolean SetExposure(Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Return true
	return Napi::Boolean::New(env, true);
}

// Set the camera gain
// Returns true
Napi::Boolean SetGain(Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Return true
	return Napi::Boolean::New(env, true);
}

// Start camera image capture
// Returns true
Napi::Boolean StartCapture(Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Return true
	return Napi::Boolean::New(env, true);
}

// Start trigger delay stopwatch
// Returns true unless "window" was not generated
Napi::Boolean EnableMessages(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Check to make sure WinAPI window was created
	if (!camera.windowGenerated) {
		return Napi::Boolean::New(env, false);
	}

	// Start the 20Hz triggering system
	triggerDelay.start();

	return Napi::Boolean::New(env, true);
}

// Send message to JavaScript with calculated centers and computation time
// Sent using emitter so JS side doesn't have to wait for results
void sendCentroids() {
	Napi::Env env = eventEmitter.Env(); // Napi local environment
	
	// Package centroid information into an object to send to JS
	Napi::Object centroidResults = Napi::Object::New(env);
	// Contains:
	// 		com_centers				-	Array		- Center of mass centroids
	//		hgcm_centers			-	Array		- HGCM method centroids
	//		computation_time		-	Float		- Time to calculate centroids (ms)
	//		is_led_on				- 	Boolean		- Whether IR LED was on in image
	//		avg_led_intensity		-	Float		- Average intensity of pixels in LED region
	//		avg_noise_intensity		-	Float		- Average intensity of pixels in noise region
	
	// First add the center of mass (CoM) centroids
	Napi::Array centroidList = Napi::Array::New(env);
	int centroidCounter = 0; // To keep track of how many center were found
	for (int center = 0; center < img.Centroids[0].width(); center++) {
		// Make sure x value is not 0 (i.e. make sure it's a real centroid)
		if (img.Centroids(0, center, 0) > 0) {
			Napi::Array spot = Napi::Array::New(env, 2); // centroid's coordinates

			float xCenter = img.Centroids(0, center, 0);
			float yCenter = img.Centroids(0, center, 1);
			float avgInt = img.Centroids(0, center, 2);
			// Account for offsets
			xCenter -= img.xLowerBound;
			yCenter -= img.yLowerBound;
			spot.Set(Napi::Number::New(env, 0), Napi::Number::New(env, xCenter));
			spot.Set(Napi::Number::New(env, 1), Napi::Number::New(env, yCenter));
			// Also include average pixel intensity
			spot.Set(Napi::Number::New(env, 2), Napi::Number::New(env, avgInt));

			// Add spot to centroidList
			centroidList.Set(centroidCounter, spot);
			centroidCounter++;
		}
	}
	centroidResults["com_centers"] = centroidList;

	// Next add the hybrid gradient CoM (HGCM) method centroids
	centroidList = Napi::Array::New(env);
	centroidCounter = 0; // To keep track of how many center were found
	for (int center = 0; center < img.Centroids[1].width(); center++) {
		// Make sure x value is not 0 (i.e. make sure it's a real centroid)
		if (img.Centroids(1, center, 0) > 0) {
			Napi::Array spot = Napi::Array::New(env, 2); // centroid's coordinates

			float xCenter = img.Centroids(1, center, 0);
			float yCenter = img.Centroids(1, center, 1);
			float avgInt = img.Centroids(1, center, 2);
			// Account for offsets
			xCenter -= img.xLowerBound;
			yCenter -= img.yLowerBound;
			spot.Set(Napi::Number::New(env, 0), Napi::Number::New(env, xCenter));
			spot.Set(Napi::Number::New(env, 1), Napi::Number::New(env, yCenter));
			// Also include average pixel intensity
			spot.Set(Napi::Number::New(env, 2), Napi::Number::New(env, avgInt));

			// Add spot to centroidList
			centroidList.Set(centroidCounter, spot);
			centroidCounter++;
		}
	}
	centroidResults["hgcm_centers"] = centroidList;

	// Add the other important values
	centroidResults["computation_time"] = Napi::Number::New(env, img.computationTime);
	centroidResults["is_led_on"] = Napi::Boolean::New(env, img.isLEDon);
	centroidResults["avg_led_intensity"] = Napi::Number::New(env, img.LEDIntensity / img.LEDCount);
	centroidResults["avg_noise_intensity"] = Napi::Number::New(env, img.NoiseIntensity / img.NoiseCount);

	// Send message to JavaScript with packaged results
	eventEmitter.Call(
		{
			Napi::String::New(env, "new-image"),
			centroidResults
		}
	);
}

// Check for messages
void CheckMessages(const Napi::CallbackInfo& info) {
	// Check if it's been more than 50ms since the last trigger event
	triggerDelay.end();
	repCount = floor(triggerDelay.time / 50);
	//if (triggerDelay.time > 50 /* ms */ && triggerDelay.time < 60 /* ms */) {
	while (simulationCount < repCount) {
		if (repCount - simulationCount >= 3) {
			simulationCount = repCount;
		}
		// (Upper time limit to test if any frames are missed)
		// Simulate image
		unsigned int randint = 1000 * triggerDelay.time; // RNG seed
		//triggerDelay.start(); // Restart trigger timer
		simulateImage(simulatedImage, randint);
		// Get image pitch
		int pPitch = camera.width;
		// Centroid
		img.centroid(camera.buffer, camera.pMem, pPitch);
		// Return calculated centers
		sendCentroids();
		simulationCount++;
	} //else if (triggerDelay.time >= 55 /* ms */) {
		// Act as if laser still fired (i.e. missed event)
		//isIROn = !isIROn;
		// Reset the timer
	//	triggerDelay.start();
	//}
}

// Pretend to close the camera
void Close(const Napi::CallbackInfo& info) {
	camera.connected = false;
}

// Set up emitter to communicate with JavaScript
void InitEmitter(const Napi::CallbackInfo& info) {
	Napi::Function emit = info[0].As<Napi::Function>();
	// Create global emitter function
	eventEmitter = Persistent(emit);
}

// Set up buffer to make image data accessible to JavaScript
// returns buffer
Napi::Value InitBuffer(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Initialize buffer in camera object
	camera.buffer.assign(4 * camera.imageLength, 0);

	// Make sure buffer has 255 for every alpha value
	for (int i = 0; i < camera.imageLength;  i++) {
		camera.buffer[4*i + 3] = 255;
	}
	// return buffer
	return Napi::Buffer<unsigned char>::New(env, camera.buffer.data(), camera.buffer.size());
}

// Set up module to export to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
	// Fill exports object with addon functions
	exports["createWinAPIWindow"] = Napi::Function::New(env, CreateWinAPIWindow);
	exports["connect"] = Napi::Function::New(env, Connect);
	exports["getInfo"] = Napi::Function::New(env, GetInfo);
	exports["setAoI"] = Napi::Function::New(env, SetAoI);
	exports["setLEDArea"] = Napi::Function::New(env, SetLEDArea);
	exports["setNoiseArea"] = Napi::Function::New(env, SetNoiseArea);
	exports["applySettings"] = Napi::Function::New(env, ApplySettings);
	exports["enableMessages"] = Napi::Function::New(env, EnableMessages);
	exports["checkMessages"] = Napi::Function::New(env, CheckMessages);
	exports["close"] = Napi::Function::New(env, Close);
	exports["initEmitter"] = Napi::Function::New(env, InitEmitter);
	exports["initBuffer"] = Napi::Function::New(env, InitBuffer);

	return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);