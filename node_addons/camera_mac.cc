#include "camera.h"

// Mac specific global variables
Timer triggerDelay; // Used for simulating 20Hz rep rate
char simulatedImage[768*768]; // Stand-in for image memory

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
	int NumberOfSpots = (rand() % 20) + 35;
	//std::vector<float> Radii = {30, 50, 90, 120, 170};
	std::vector<int> Radii = {30 + (rand() % 50 - 18), 70 + (rand() % 40 - 20), 90 + (rand() % 40 - 20), 100 + (rand() % 20 - 10),
		110 + (rand() % 10 - 7), 110 + (rand() % 10 - 7), 110 + (rand() % 10 - 7), 
		260 + (rand() % 40 - 20), 280 + (rand() % 40 - 20), 300 + (rand() % 10 - 7), 300 + (rand() % 10 - 7)};

	// First clear the image (i.e. fill with 0's)
	// 		(Unnecessary if adding noise)
	//std::fill(std::begin(simImage), std::end(simImage), 0);

	CImg<float> ActualCenters;
	ActualCenters.assign(100, 2);

	// Get center of image
	int imageCenterX = 768 / 2;
	int imageCenterY = 768 / 2;

	// Add noise to the image
	for (int i = 0; i < 768*768; i++) {
		int noise = rand() % 5;
		simImage[i] = noise;
	}

	// Add spots
	int spotNumber = 0;
	while (spotNumber < NumberOfSpots)
	{
		int radIndex = rand() % Radii.size();
		bool useWide = false;
		if (radIndex == 4 || radIndex == 5 || radIndex == 6 || radIndex == 9 || radIndex == 10) {
			useWide = true;
		}
		float radius = Radii[radIndex];

		///////////////////////////////
		//
		//
		// Try "shutting off the mcp" by not letting a spot land where there was one in the last image
		//
		//
		//////////////////////////////// 


		if (rand() % 60 == 0) {
			radius = 360 + (rand() % 20) - (rand() % 20);
		}
		if (rand() % 30 == 0) {
			radius = 340 + (rand() % 20) - (rand() % 20);
		}

		radius += ( 2 * (rand() % 500000) - 500000 ) / 1000000.0;
		
		// Using the physics def. of spherical coords
		float phi = 2 * pi * ((rand() % 100000) / 100000.0);		 // (0,2pi)
		float costheta = 2.0 * ((rand() % 100000) / 100000.0) - 1.0; // (-1,1)
		float theta = acos(costheta);
		float centerX = imageCenterX + radius * sin(theta) * cos(phi); // Converting to Cartesian coords
		float centerY = imageCenterY + radius * cos(theta);
		float widthX = (rand() % 500 + 1000) / 100.0; // Randomly chooses widths btw 10.0 and 15.0 pixels (closer to real spot sizes)
		float widthY = (rand() % 500 + 1000) / 100.0;
		float percentIntensity = (rand() % 30 + 30) / 100.0; // Choosing intensity btw 50% and 110%

		if (useWide) {
			widthX *= 1.5;
			widthY *= 1.5;
		}

		// Make electrons repel each other if close
		for (int i = 0; i < 100; i++) {
			if (ActualCenters(i, 0) > 0) {
				float oldRadius = sqrt(pow(ActualCenters(i, 0), 2) + pow(ActualCenters(i, 1), 2));
				float newRadius = sqrt(pow(centerX, 2) + pow(centerY, 2));
				if (oldRadius - 1.5 < newRadius && newRadius < oldRadius + 1.5) {
					theta = atan((ActualCenters(i, 1) - centerY) / (ActualCenters(i, 0) - centerX));
					float radiusDelta = (rand() % 6000) / 1000.0;

					//std::cout << "X = " << centerX << " + " << radiusDelta * cos(theta) << "; Y = " << centerY << " + " << radiusDelta * sin(theta) << std::endl;
					centerX += radiusDelta * cos(theta);
					centerY += radiusDelta * sin(theta);
				}
			}
		}


		// Add the spot to the image
		if (centerY - 8 < 0) {
			centerY = 8;
		}
		if (centerX - 8 < 0) {
			centerX = 8;
		}
		for (int Y = centerY - 8; Y < centerY + 9 || Y < 768; Y++)
		{
			for (int X = centerX - 8; X < centerX + 9 || X < 768; X++)
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
		ActualCenters(spotNumber, 0) = centerX;
		ActualCenters(spotNumber, 1) = centerY;
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

// Check for messages
void CheckMessages(const Napi::CallbackInfo& info) {
	// Check if it's been more than 50ms since the last trigger event
	triggerDelay.end();
	if (triggerDelay.time > 50 /* ms */) {
		// Simulate image
		unsigned int randint = 1000 * triggerDelay.time; // RNG seed
		triggerDelay.start(); // Restart trigger timer
		simulateImage(simulatedImage, randint);
		// Get image pitch
		int pPitch = 768;
		// Centroid
		Img.centroid(buffer, pMem, pPitch);
		// Return calculated centers
		sendCentroids();
	}
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