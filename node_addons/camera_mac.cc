#include "camera.h"

// Mac specific global variables
Timer triggerDelay; // Used for simulating 20Hz rep rate
char simulatedImage[768*768]; // Stand-in for image memory
bool isIROn = false;

// Constants
float const pi = 3.14159265358979;

// End of global variables


/* 
	PascalCase functions are Napi functions that can be called from JavaScript
		These functions are camelCase on JavaScript side (i.e. camera.close())
	camelCase functions are C++ functions that can only be called from C++
*/ 

// 
// C++ functions
//

float Gauss(int i, float center, float width)
{
	return sqrt(255) * exp(-pow(i - center, 2) / width);
}

void simulateImage(char simImage[], unsigned int randSeed) {
	srand(randSeed); // Setting up random number generator

	// Simulated values
	int NumberOfSpots = (rand() % 10) + 15;
	//std::vector<float> Radii = {30, 50, 90, 120, 170};
	std::vector<float> Radii = {50, 50, 90, 90, 90, 90, 170, 170, 170};

	// First clear the image (i.e. fill with 0's)
	// 		(Unnecessary if adding noise)
	//std::fill(std::begin(simImage), std::end(simImage), 0);

	// Get center of image
	int imageCenterX = 768 / 2;
	int imageCenterY = 768 / 2;

	// Add noise to the image
	for (int i = 0; i < 768*768; i++) {
		int noise = rand() % 5;
		simImage[i] = noise;
	}

	if (isIROn) {
		isIROn = false;
		//Radii = {50, 50, 90, 90, 90, 120, 120, 170};
		return;
	} else {
		isIROn = true;
	}

	// Add spots
	int spotNumber = 0;
	while (spotNumber < NumberOfSpots)
	{
		float radius = Radii[rand() % Radii.size()];
		
		// Using the physics def. of spherical coords
		float phi = 2 * pi * ((rand() % 1000) / 1000.0);		 // (0,2pi)
		float costheta = 2.0 * ((rand() % 1000) / 1000.0) - 1.0; // (-1,1)
		float theta = acos(costheta);
		float centerX = imageCenterX + radius * sin(theta) * cos(phi); // Converting to Cartesian coords
		float centerY = imageCenterY + radius * cos(theta);
		float widthX = (rand() % 50 + 100) / 10.0; // Randomly chooses widths btw 10.0 and 15.0 pixels (closer to real spot sizes)
		float widthY = (rand() % 50 + 100) / 10.0;
		float percentIntensity = (rand() % 60 + 50) / 100.0; // Choosing intensity btw 50% and 110%

		// Add the spot to the image
		for (int Y = centerY - 8; Y < centerY + 9; Y++)
		{
			for (int X = centerX - 8; X < centerX + 9; X++)
			{
				int intensity = round(Gauss(Y, centerY, widthY) * Gauss(X, centerX, widthX) * percentIntensity);
				int currentIntensity = (unsigned char)simImage[768*Y + X];
				currentIntensity += intensity;
				if (currentIntensity > 255)
				{
					currentIntensity = 255; // Cuts off intensity at 255
				}
				simImage[768*Y + X] = currentIntensity;
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

	Img.Image.assign(768,768);
	Img.RegionImage.assign(768, 768);
	Img.RegionVector.assign(500, 1);
	Img.COMs.assign(500, 4);

	windowGenerated = true;

	return Napi::Boolean::New(env, windowGenerated);
}

// Pretend to connect to the camera
// Returns true
Napi::Boolean Connect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	cameraConnected = true;

	return Napi::Boolean::New(env, cameraConnected);
}

// Pretend to apply camera settings
// Initialize image for centroiding
// Get pMem;
// Returns true unless camera was not "initialized"
Napi::Boolean ApplySettings(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Check to make sure camera was initialized first
	if (!cameraConnected) {
		std::cout << "Camera was not initialized!" << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Fill image with 0's
	std::fill(std::begin(simulatedImage), std::end(simulatedImage), 0);

	// Get image memory address
	pMem = &simulatedImage[0];

	// Initialize image array for centroiding
	Img.Image.assign(768, 768);

	return Napi::Boolean::New(env, true);
}

// Start trigger delay stopwatch
// Returns true unless "window" was not generated
Napi::Boolean EnableMessages(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Check to make sure WinAPI window was created
	if (!windowGenerated) {
		return Napi::Boolean::New(env, false);
	}

	triggerDelay.start();

	return Napi::Boolean::New(env, true);
}

int repCount = 0;
int simulationCount = 0;

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
		int pPitch = 768;
		// Centroid
		Img.centroid(buffer, pMem, pPitch);
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
	cameraConnected = false;
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
	// Make sure buffer has 255 for every alpha value
	for (int i = 0; i < 768*768; i++) {
		buffer[4*i + 3] = 255;
	}
	// return buffer
	return Napi::Buffer<unsigned char>::New(env, buffer.data(), buffer.size());
}

// Set up module to export to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
	// Fill exports object with addon functions
	exports["createWinAPIWindow"] = Napi::Function::New(env, CreateWinAPIWindow);
	exports["connect"] = Napi::Function::New(env, Connect);
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