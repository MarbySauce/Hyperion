#ifndef UNICODE
#define UNICODE
#endif

#include "camera.h"
#include "centroid.h"
#include <napi.h>
#include <windows.h>
#include <uEye.h>

// Global variables
Camera camera; // Contains important info about the camera
Centroid img; // Variables and functions for centroiding image
Napi::FunctionReference eventEmitter; // Used to quickly send image and centroids to JS side

// Windows specific global variables
HWND hWnd;
HIDS hCam = 0;
// End of global variables


/* 
	PascalCase functions are Napi functions that can be called from JavaScript
		These functions are camelCase on JavaScript side (i.e. camera.getInfo() in InvisibleWindow.js)
	camelCase functions are C++ functions that can only be called from C++
*/ 



// Create a WinAPI window to receive windows messages 
// (e.g. frame event from camera)
// Returns whether window was created
Napi::Boolean CreateWinAPIWindow(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	HINSTANCE hInstance; // Necessary(?) bullshit

	// Register the window class
	const wchar_t CLASS_NAME[] = L"Sample Window Class"; // Necessary?

	WNDCLASS wc = { };

	wc.lpfnWndProc = DefWindowProc;
	wc.hInstance = hInstance;
	wc.lpszClassName = CLASS_NAME;

	RegisterClass(&wc);

	// Create the window
	hWnd = CreateWindowEx(0, CLASS_NAME, L"WinAPI Window", NULL,
		CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT, CW_USEDEFAULT,
		NULL, NULL, hInstance, NULL);
	
	if (hWnd == NULL) {
		camera.windowGenerated = false;
	} else {
		camera.windowGenerated = true;
	}

	return Napi::Boolean::New(env, camera.windowGenerated);
}

// Connect to the camera
// Returns whether camera was successfully connected
Napi::Boolean Connect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Connect to the camera
	int nRet = is_InitCamera(&hCam, NULL);
	if (nRet == IS_SUCCESS) {
		camera.connected = true;
	} else {
		camera.connected = false;
		std::cout << "Could not connect to camera. Error: " << nRet << std::endl;
	}

	return Napi::Boolean::New(env, camera.connected);
}

// Get the camera info
// Returns object with information
Napi::Object GetInfo(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	Napi::Object information; // Object to be returned
	// Fill out with blank information in case camera is not connected
	information["infoReceived"] = Napi::Boolean::New(env, false);
	information["model"] = Napi::String::New(env, "");
	information["ID"] = Napi::Number::New(env, 0);
	information["colorMode"] = Napi::Number::New(env, 0);
	information["width"] = Napi::Number::New(env, 0);
	information["height"] = Napi::Number::New(env, 0);

	// Make sure camera was connected to first
	if (camera.connected) {
		// Get camera information
		SENSORINFO pInfo;
		int nRet = is_GetSensorInfo(hCam, &pInfo); 
		// Make sure info was properly received
		if (nRet == IS_SUCCESS) {
			// Update camera information in C++ object
			camera.infoReceived = true;
			camera.model = pInfo.strSensorName;
			camera.ID = pInfo.SensorID;
			camera.colorMode = pInfo.nColorMode;
			camera.width = pInfo.nMaxWidth;
			camera.height = pInfo.nMaxHeight;
			camera.imageLength = camera.width * camera.height;
			// Update JS object
			information["infoReceived"] = Napi::Boolean::New(env, true);
			information["model"] = Napi::String::New(env, camera.model);
			information["ID"] = Napi::Number::New(env, camera.ID);
			information["colorMode"] = Napi::Number::New(env, camera.colorMode);
			information["width"] = Napi::Number::New(env, camera.width);
			information["height"] = Napi::Number::New(env, camera.height);
		}
	}

	return information;
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

// Apply camera settings
// Returns false unless all were successful
// NOTE: Each of these should be separate functions, and ApplySettings should be a JS setting
Napi::Boolean ApplySettings(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Initialize image array for centroiding
	img.Image.assign(camera.width, camera.height);
	img.RegionImage.assign(camera.width, camera.height);
	img.RegionVector.assign(1500, 1);
	img.COMs.assign(1500, 4);

	// Check to make sure camera was initialized first
	if (!camera.connected) {
		std::cout << "Camera was not initialized!" << std::endl;
		return Napi::Boolean::New(env, false);
	}

	int nRet; // Return values from uEye functions

	// Set color mode
	nRet = is_SetColorMode(hCam, IS_CM_MONO8);
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting color mode failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Set display mode
	nRet = is_SetDisplayMode(hCam, IS_SET_DM_DIB);
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting display mode failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Set area of interest
	/*IS_RECT AreaOfInterest; // Object to contain AoI info
	AreaOfInterest.s32X = 100; // Left offset
	AreaOfInterest.s32Y = 0; // Top offset
	AreaOfInterest.s32Width = 768; // Image width
	AreaOfInterest.s32Height = 768; // Image height
	nRet = is_AOI(hCam, IS_AOI_IMAGE_SET_AOI, (void*)&AreaOfInterest, sizeof(AreaOfInterest));
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting AoI failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}*/

	// Allocate memory for images
	// Fills pMem with image memory address
	nRet = is_AllocImageMem(hCam, 1024, 768, 8, &camera.pMem, &camera.memID);
	if (nRet != IS_SUCCESS) {
		std::cout << "Allocating memory failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Tell camera where to put image data
	nRet = is_SetImageMem(hCam, camera.pMem, camera.memID);
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting active memory failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Set trigger to rising-edge external
	nRet = is_SetExternalTrigger(hCam, IS_SET_TRIGGER_LO_HI);
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting trigger failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Recommended order of operations is:
	//      set pixel clock
	//      set frame rate
	//      set exposure

	// Set pixel clock
	int pixClock = 30; // MHz
	nRet = is_PixelClock(hCam, IS_PIXELCLOCK_CMD_SET, (void*)&pixClock, sizeof(pixClock));
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting pixel clock failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// No need to set frame rate

	// Set exposure
	double exposure = 6; // ms
	nRet = is_Exposure(hCam, IS_EXPOSURE_CMD_SET_EXPOSURE, &exposure, sizeof(exposure));
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting exposure failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Set hardware gain
	int gain = 75;
	nRet = is_SetHardwareGain(hCam, gain, IS_IGNORE_PARAMETER, IS_IGNORE_PARAMETER, IS_IGNORE_PARAMETER);
	if (nRet != IS_SUCCESS) {
		std::cout << "Setting gain failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Start image capture
	nRet = is_CaptureVideo(hCam, IS_WAIT);
	if (nRet != IS_SUCCESS) {
		std::cout << "Starting capture failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	return Napi::Boolean::New(env, true);
}

// Enable Windows messages
Napi::Boolean EnableMessages(Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Check to make sure WinAPI window was created
	// and that the camera was connected
	if (!camera.windowGenerated || !camera.connected) {
		return Napi::Boolean::New(env, false);
	}

	// Enable frame event messages
	int nRet = is_EnableMessage(hCam, IS_FRAME, hWnd);
	if (nRet != IS_SUCCESS) {
		std::cout << "Enable messages failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	return Napi::Boolean::New(env, true);
}

// Send message to JavaScript with calculated centers and computation time
// Sent using emitter so JS side doesn't have to wait for results
void sendCentroids() {
	Napi::Env env = eventEmitter.Env(); // Napi local environment
	
	// Package centers and compute time into an array
	// NOTE: can this be done as an object instead?
	// 0 -> CCL centers, 1 -> hybrid centers, 2 -> computation time
	Napi::Array centroidResults = Napi::Array::New(env, 3);

	// First add the centroids
	for (int centroidMethod = 0; centroidMethod < 2; centroidMethod++) {
		// Create a temporary array to fill with each method's calculated centroids
		Napi::Array centroidList = Napi::Array::New(env);
		int centroidCounter = 0; // To keep track of how many center were found
		for (int center = 0; center < img.Centroids[centroidMethod].width(); center++) {
			// Make sure x value is not 0 (i.e. make sure it's a real centroid)
			if (img.Centroids(centroidMethod, center, 0) > 0) {
				Napi::Array spot = Napi::Array::New(env, 2); // centroid's coordinates

				float xCenter = img.Centroids(centroidMethod, center, 0);
				float yCenter = img.Centroids(centroidMethod, center, 1);
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
	centroidResults.Set(2, img.computationTime); 

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
	MSG msg = { }; // To store message info
	// Check if there is a message in queue, return if not
	if (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
		// Check if the message is from the camera
		if (msg.message == IS_UEYE_MESSAGE) {
			// Check if the message is a frame event
			if (msg.wParam == IS_FRAME) {
				// Get image pitch
				int pPitch;
				is_GetImageMemPitch(hCam, &pPitch);
				// Centroid
				img.centroid(camera.buffer, camera.pMem, pPitch);
				// Return calculated centers
				sendCentroids();
			}
		}
	}
}

// Close the camera
void Close(const Napi::CallbackInfo& info) {
	int nRet;

	// Disable messages
	nRet = is_EnableMessage(hCam, IS_FRAME, NULL);
	std::cout << "\nDisable messages: " << nRet << std::endl;

	// Stop image capture
	nRet = is_StopLiveVideo(hCam, IS_WAIT);
	std::cout << "Stop video: " << nRet << std::endl;

	// Close camera
	nRet = is_ExitCamera(hCam);
	std::cout << "Exit camera: " << nRet << std::endl;

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
	for (int i = 0; i < camera.imageLength; i++) {
		camera.buffer[4*i + 3] = 255;
	}

	// return buffer
	return Napi::Buffer<unsigned char>::New(env, camera.buffer.data(), camera.buffer.size());
}

// Set up module to export functions to JavaScript
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