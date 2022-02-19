# C++ Camera Functions

Here is a list of the Napi functions used in camera\_[OS].cc which can
be called by JavaScript

Since the camera is actually only accessed in camera_win.cc, the functions in
camera_mac.cc are just dummy functions so JS has something to call

In the .cc files, each function begins with a capital letter to distinguish it
as a Napi function, but when called from the JS side, functions must start with
a lowercase letter. In both cases, functions are camelCase
(e.g. GetInfo() on .cc side, but getInfo() on JS side)

<br>
<br>

# Napi Functions

## createWinAPIWindow()

> Parameters: None
>
> Returns: Boolean describing success of function call

Create a WinAPI window in order to receive messages from the uEye camera

<br>

## connect()

> Parameters: None
>
> Returns: Boolean describing success of funtion call

Connect to the camera

<br>

## getInfo()

> Parameters: None
>
> Returns: Object with properties:
>
> > infoReceived - (Boolean) Whether info was successfully received  
> > model - (String) Camera model number  
> > ID - (Number) Camera ID number  
> > colorMode - (Number) Camera color mode (monochrome, etc.)  
> > width - (Number) Max image width  
> > height - (Number) Max image height

Queries information from the camera and returns  
Also fills in the `camera` class (from camera.h) with this information

<br>

## setAoI(int AoIWidth, int AoIHeight [, int leftOffset, int topOffset])

> Parameters:
>
> > AoIWidth - (Number) Width of Area of Interest (px)  
> > AoIHeight - (Number) Height of Area of Interest (px)  
> > (Optional)  
> > leftOffset - (Number) Amount to shift AoI left (px)  
> > topOffset - (Number) Amount to shift AoI down (px)
> >
> > Offsets assumed to be 0 if not specified
>
> Returns: None

Set the Area of Interest to centroid, as well as the offset of the AoI

<br>

## setLEDArea(int LEDxLowerBound, int LEDxUpperBound, int LEDyLowerBound, int LEDyUpperBound)

> Parameters:
>
> > LEDxLowerBound - (Number) Left-side starting point  
> > LEDxUpperBound - (Number) Right-side ending point  
> > LEDyLowerBound - (Number) Top-side starting point  
> > LEDyUpperBound - (Number) Bottom-side ending point
>
> Returns: None

Set the area of the image which contains the LED used for IR On/Off binning

<br>

## setNoiseArea(int NoisexLowerBound, int NoisexUpperBound, int NoiseyLowerBound, int NoiseyUpperBound)

> Parameters:
>
> > NoisexLowerBound - (Number) Left-side starting point  
> > NoisexUpperBound - (Number) Right-side ending point  
> > NoiseyLowerBound - (Number) Top-side starting point  
> > NoiseyUpperBound - (Number) Bottom-side ending point
>
> Returns: None

Set the area of the image which contains only noise,
used as comparison for LED area

<br>

## setExposure(double exposure)

> Parameters:
>
> > exposure - (Number) exposure time (ms)
>
> Returns: Boolean describing success of funtion call

Set the camera exposure time. Before setting, it checks that the
requested exposure time is within camera's bounds

<br>

## setGain(int gain)

> Parameters:
>
> > gain - (Number) percent gain as integer value, between 0-100
>
> Returns: Boolean describing success of function call

Set the camera gain. Checks that gain is between 0 and 100 inclusive.

<br>

## startCapture()

> Parameters: None
>
> Returns: Boolean describing success of function call

Start camera image capture

<br>

## enableMessages()

> Parameters: None
>
> Returns: Boolean describing success of funtion call

Enables messages to be sent from camera to WinAPI window when a picture is taken.  
Fails if WinAPI window is not generated or camera is not connected

<br>

## checkMessages()

> Parameters: None
>
> Returns: None

Check if a new message from the camera has been received.
Note: Using this function inside setTimeout({}, 0) uses the JS event loop
as a means to replace the WinAPI message loop

<br>

## close()

> Parameters: None
>
> Returns: None

Closes the camera

<br>

## initEmitter()

> Parameters: `emitter.emit.bind(emitter)` where emitter is an EventEmitter  
> I have no idea how to refer to that
>
> Returns: None

Initialize the emitter on the C++ side in order to send centroid information
once the program is done centroiding.

<br>

## initBuffer()

> Parameters: None
>
> Returns: Uint8 array buffer

Creates an array the size of 4 \* (image width \* image height) to quickly
send the image from C++ to JS. Each pixel has an RGBA value in the buffer.
Must be called after getting the camera information.

<br>

<br>

# C++ Functions

<br>

## sendCentroids()

> Parameters: None
>
> Returns: None

After image is centroided, packages up results into an object and
sends to JS side in the form of a message sent to the emitter  
Object properties:

> > CCLCenters - (Array) Connected component labeling method centroids ([x,y] elements)
> > hybridCenters - (Array) Hybrid method centroids ([x,y] elements)
> > computationTime - (Number) Time taken to calculate centroids (ms)
> > isLEDon - (Boolean) Whether IR LED was on in that image
> > normNoiseIntensity - Ratio of LED area to Noise area normalized intensities
