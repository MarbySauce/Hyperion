#ifndef UNICODE
#define UNICODE
#endif

#include <iostream>
#include <string>
#include <napi.h>
#include <windows.h>
#include "timer.h"

using namespace std;

extern "C" {
    void setoptions_(char OptString[], long int strlength);
    //void checkoption_(string key, int iopt, double fopt, bool qopt);
}

void Test(const Napi::CallbackInfo& info) {
    char string1[] = "test_image.dat -LP2";
    long int strlength = sizeof string1;

    cout << "Before running" << endl;
    cout << string1 << endl;

    setoptions_(string1, strlength);
    // Need to end the string with a null character since Fortran doesn't (but C++ requires it)
    string1[strlength-1] = NULL;

    //string k ("L"); int i = 0; double f; bool q;
    //checkoption_(k, i, f, q);

    cout << "After running" << endl;
    cout << string1 << endl;
    
    Timer time;
    Sleep(1000);
    time.endPrint("Done");

    cout << "Done with this" << endl;
}

void Test2(const Napi::CallbackInfo& info) {
    char* string1 = "Hello World";

    cout << string1 << endl;
}

// Set up module to export functions to JavaScript
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    // Fill exports object with addon functions
    exports["test"] = Napi::Function::New(env, Test);
    exports["test2"] = Napi::Function::New(env, Test2);

    return exports;
}

// Initialize node addon
NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init);