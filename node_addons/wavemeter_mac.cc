#ifndef UNICODE
#define UNICODE
#endif

#include <string>
#include <vector>
#include <napi.h>

// Global variables
Napi::FunctionReference macWavelengthFn;

// Start Wavemeter Application
Napi::Number NapiStartApplication(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Exit Wavemeter Application
Napi::Number NapiStopApplication(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Set Return Mode such that the GetWavelength function only returns the 
// latest calculated wavelength value if it hasn't previously been requested,
// otherwise it returns 0. E.g. if the wavelength was measured once but GetWavelength was
// called twice in a row, it will return the wavelength the first time, then return 0
Napi::Number NapiSetReturnModeNew(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Set Return Mode such that the GetWavelength function always returns the 
// latest calculated wavelength value
Napi::Number NapiSetReturnModeAll(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Start a wavelength measurement
Napi::Number NapiStartMeasurement(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// End wavelength measurement
Napi::Number NapiStopMeasurement(const Napi::CallbackInfo& info) {
	Napi::Env env = info.Env(); // Napi local environment

	// Error return value
	long retVal = 0; // No error

	// Return error value
	return Napi::Number::New(env, retVal);
}

// Get wavelength of the specified channel
// @param {int} channel - Which channel to measure wavelength of (1, 2, ...etc)
Napi::Value NapiGetWavelength(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env(); // Napi local environment

	Napi::Number channel = info[0].ToNumber();

	return macWavelengthFn.Call({channel});
}

// Set up Mac simulation wavelength function
void SetUpFunction(const Napi::CallbackInfo& info) {
	macWavelengthFn = Napi::Persistent(info[0].As<Napi::Function>());
}

// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
	// Fill exports object with addon functions
	exports["startApplication"] = Napi::Function::New(env, NapiStartApplication);
	exports["stopApplication"] = Napi::Function::New(env, NapiStopApplication);
	exports["setReturnModeNew"] = Napi::Function::New(env, NapiSetReturnModeNew);
	exports["setReturnModeAll"] = Napi::Function::New(env, NapiSetReturnModeAll);
	exports["startMeasurement"] = Napi::Function::New(env, NapiStartMeasurement);
	exports["stopMeasurement"] = Napi::Function::New(env, NapiStopMeasurement);
	exports["getWavelength"] = Napi::Function::New(env, NapiGetWavelength);
	exports["setUpFunction"] = Napi::Function::New(env, SetUpFunction);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);