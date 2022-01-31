#ifndef UNICODE
#define UNICODE
#endif

#include "camera.h"
#include <windows.h>
#include <uEye.h>

// Windows specific global variables
HWND hWnd;
HIDS hCam = 0;

// End of global variables


/* 
	PascalCase functions are Napi functions that can be called from JavaScript
		These functions are camelCase on JavaScript side (i.e. camera.close())
	camelCase functions are C++ functions that can only be called from C++
*/ 



// Create a WinAPI window to receive windows messages 
// (e.g. frame event from camera)
// Returns whether window was created
Napi::Boolean CreateWinAPIWindow(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	Img.Image.assign(1024, 768);
	Img.RegionImage.assign(1024, 768);
	Img.RegionVector.assign(1500, 1);
	Img.COMs.assign(1500, 4);

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
		windowGenerated = false;
	} else {
		windowGenerated = true;
	}

	return Napi::Boolean::New(env, windowGenerated);
}

// Connect to the camera
// Returns whether camera was successfully connected
Napi::Boolean Connect(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Connect to the camera
	int nRet = is_InitCamera(&hCam, NULL);
	if (nRet == IS_SUCCESS) {
		cameraConnected = true;
		// Get camera information
		SENSORINFO pInfo;
		int nRet2 = is_GetSensorInfo(hCam, &pInfo);
		std::cout << "Camera info success: " << nRet2 << std::endl;
		if (nRet2 == IS_SUCCESS) {
			std::cout << "Camera sensor ID: " << pInfo.SensorID << std::endl;
			std::cout << "Camera model: " << pInfo.strSensorName << std::endl;
			std::cout << "Camera color mode: " << pInfo.nColorMode << std::endl;
			std::cout << "Camera max width: " << pInfo.nMaxWidth << std::endl;
			std::cout << "Camera max height: " << pInfo.nMaxHeight << std::endl;
		}
	} else {
		cameraConnected = false;
		std::cout << "Could not connect to camera. Error: " << nRet << std::endl;
	}

	return Napi::Boolean::New(env, cameraConnected);
}

// Apply camera settings
// Returns false unless all were successful
Napi::Boolean ApplySettings(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Initialize image array for centroiding
	Img.Image.assign(1024, 768);

	// Check to make sure camera was initialized first
	if (!cameraConnected) {
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
	nRet = is_AllocImageMem(hCam, 1024, 768, 8, &pMem, &memID);
	if (nRet != IS_SUCCESS) {
		std::cout << "Allocating memory failed with error: " << nRet << std::endl;
		return Napi::Boolean::New(env, false);
	}

	// Tell camera where to put image data
	nRet = is_SetImageMem(hCam, pMem, memID);
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
	if (!windowGenerated || !cameraConnected) {
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
				Img.centroid(buffer, pMem, pPitch);
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
	//nRet = is_ExitCamera(hCam);
	//std::cout << "Exit camera: " << nRet << std::endl;

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
	for (int i = 0; i < 1024*768; i++) {
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