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

// Check if the Wavemeter Application is open
Napi::Boolean NapiIsOpen(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Check if the program is already running
	long retVal = Instantiate(cInstCheckForWLM, 0, 0, 0);
	// retVal == 0 if closed, else > 0

	return Napi::Boolean::New(env, (retVal > 0));
}

// Set Return Mode such that the GetWavelength function only returns the 
// latest calculated wavelength value if it hasn't previously been requested,
// otherwise it returns 0. E.g. if the wavelength was measured once but GetWavelength was
// called twice in a row, it will return the wavelength the first time, then return 0
Napi::Number NapiSetReturnModeNew(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	long retVal = Instantiate(cInstReturnMode, 1, 0, 0);

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Set Return Mode such that the GetWavelength function always returns the 
// latest calculated wavelength value
Napi::Number NapiSetReturnModeAll(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	long retVal = Instantiate(cInstReturnMode, 0, 0, 0);

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

	// Program is not running, open new window
	if (retVal == 0) {
		retVal = ControlWLM(cCtrlWLMShow, 0, 0);
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

// Get wavelength of the specified channel
// @param {int} channel - Which channel to measure wavelength of (1, 2, ...etc)
Napi::Number NapiGetWavelength(const Napi::CallbackInfo& info) {
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
	// Note: Wavemeter also has GetWavelength() function, however this only measures the first channel
	// GetWavelength(0) is equivalent to GetWavelengthNum(1, 0)

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
	exports["isOpen"] = Napi::Function::New(env, NapiIsOpen);
	exports["setReturnModeNew"] = Napi::Function::New(env, NapiSetReturnModeNew);
	exports["setReturnModeAll"] = Napi::Function::New(env, NapiSetReturnModeAll);
	exports["startMeasurement"] = Napi::Function::New(env, NapiStartMeasurement);
	exports["stopMeasurement"] = Napi::Function::New(env, NapiStopMeasurement);
	exports["getWavelength"] = Napi::Function::New(env, NapiGetWavelength);
	exports["setUpFunction"] = Napi::Function::New(env, NapiSetUpFunction);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);