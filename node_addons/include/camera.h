#include <vector>

// Class which contains useful information about the camera
class Camera
{
public:
	// Info retrieved from camera
	int width; 				// Max width of camera frame
	int height;				// Max height of camera frame
	unsigned short ID;		// Camera ID
	char model[32];			// Camera model number
	int colorMode;			// Color mode of camera

	// non-OS specific variables used by camera (i.e. not Windows data types)
	char* pMem; 			// Starting address of camera image memory
	int memID;				// ID of image memory

	// Other useful variables
	bool connected = false; 			// Whether camera was successfully connected
	bool infoReceived = false;			// Whether camera info was received
	bool windowGenerated = false; 		// Whether WinAPI window was generated
	std::vector<unsigned char> buffer; 	// Stores the image as a buffer (to pass to JS side)
	int imageLength; 					// Number of pixels in image (useful for for-loops)
};