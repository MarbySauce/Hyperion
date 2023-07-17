#ifndef UNICODE
#define UNICODE
#endif

#include <string>
#include <napi.h>
#include <windows.h>
#include <wlmData.h>

/*
Important Note:
    Unlike camera_{OS}.cc, functions here all start with Napi
    to differentiate them from the functions in wlmData.dll with 
    the same name. Functions in JS are still called in camelCase, with
    Napi removed from the beginning. 
    i.e. NapiGetWavelength() would be called from JS as getWavelength()
*/

// Start Wavemeter Application
Napi::Number NapiStartApplication(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal;

	// Check if the program is already running
	retVal = Instantiate(cInstCheckForWLM, 0, 0, 0);

	// Program is not running, open new window
	if (retVal == 0) {
		retVal = ControlWLM(cCtrlWLMShow, 0, 0);
	}

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Exit Wavemeter Application
Napi::Number NapiStopApplication(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal;

	// Check if the program is already running
	retVal = Instantiate(cInstCheckForWLM, 0, 0, 0);

	// Program is running, exit application
	if (retVal > 0) {
		retVal = ControlWLM(cCtrlWLMExit, 0, 0);
	}

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Start a wavelength measurement
Napi::Number NapiStartMeasurement(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal;

	// Check if the program is already running
	retVal = Instantiate(cInstCheckForWLM, 0, 0, 0);

	// Program is not running, return -1 error code
	if (retVal == 0) {
		return Napi::Number::New(env, -1);
	}

	// Start measurement
	retVal = Operation(cCtrlStartMeasurement);

	// Return error value
	return Napi::Number::New(env, retVal);
}

// End wavelength measurement
Napi::Number NapiStopMeasurement(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = Operation(cCtrlStopAll);

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Get wavelength of the first channel
Napi::Number NapiGetWavelength(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env(); // Napi local environment

    // Get wavelength
    double lambda = GetWavelength(0);

    // Return wavelength
    return Napi::Number::New(env, lambda);
}

// Get wavelength of the specified channel
// This is the preferred function to use
Napi::Number NapiGetWavelengthNum(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env(); // Napi local environment

	// Get the user specified channel
	// First, make sure (first) argument passed is a number (we don't care about the other arguments if there are any)
	if (!info[0].IsNumber()) {
		Napi::Error::New(env, "getWavelengthNum: Wavemeter channel must be a number").ThrowAsJavaScriptException();
		return Napi::Number::New(env, 0);
	}
	// Convert Napi number to C++ long
	long channel = (long)info[0].ToNumber().Int64Value();

    // Get wavelength
    double lambda = GetWavelengthNum(channel, 0);

    // Return wavelength
    return Napi::Number::New(env, lambda);
}


// On Mac, this sets up function to simulate wavelength
// 		here it does nothing
void NapiSetUpFunction(const Napi::CallbackInfo& info) {
	return;
}

// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
	// Fill exports object with addon functions
	exports["startApplication"] = Napi::Function::New(env, NapiStartApplication);
	exports["stopApplication"] = Napi::Function::New(env, NapiStopApplication);
	exports["startMeasurement"] = Napi::Function::New(env, NapiStartMeasurement);
	exports["stopMeasurement"] = Napi::Function::New(env, NapiStopMeasurement);
	exports["getWavelength"] = Napi::Function::New(env, NapiGetWavelength);
	exports["getWavelengthNum"] = Napi::Function::New(env, NapiGetWavelengthNum);
	exports["setUpFunction"] = Napi::Function::New(env, NapiSetUpFunction);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);