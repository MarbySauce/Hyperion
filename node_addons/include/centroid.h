#include <math.h>
#include <vector>
#include "CImg.h"
#include "timer.h"

#include <stdio.h>

using namespace cimg_library;

/* ---------- Class for Individual Image Simulation + Centroiding ---------- */
class Centroid
{
public:
	int CCLCount;
	int HybridCount;			 // Count of centroided electrons
	unsigned int regions;		 // Number of different regions found
	unsigned int threshold = 20; // Lower limit of image signal / upper limit of image noise
	int minPix = 3;				 // Lower region bound to calculate center for
	int maxPix = 120;			 // Upper region bound to use CoM method

	// Defines the area of interest to centroid
	int xLowerBound = 0;	// Left side starting boundary
	int xUpperBound = 0;	// Right side ending boundary
	int yLowerBound = 0;	// Top starting boundary
	int yUpperBound = 0;	// Bottom ending boundary

	// Defines the area to check for the IR LED
	// As well as the area of just background noise (for comparison)
	int LEDxLowerBound = 0;		// Left side starting boundary
	int LEDxUpperBound = 0;		// Right side ending boundary
	int LEDyLowerBound = 0;		// Top starting boundary
	int LEDyUpperBound = 0;		// Bottom ending boundary
	int NoisexLowerBound = 0;	// Left side starting boundary
	int NoisexUpperBound = 0;	// Right side ending boundary
	int NoiseyLowerBound = 0;	// Top starting boundary
	int NoiseyUpperBound = 0;	// Bottom ending boundary
	
	int LEDIntensity = 0;		// Total pixel intensity of LED area
	float LEDCount = 0;			// Number of pixels in LED area
	int NoiseIntensity = 0;		// Total pixel intensity of Noise area
	float NoiseCount = 0;		// Number of pixels in Noise area
	bool isLEDon = false; 		// Whether LED is on, indicating IR laser fired this image

	bool UseHybridMethod = true;		// Whether to use hybrid method

	CImg<unsigned int> Image;		 // Image to centroid
	CImg<unsigned int> RegionImage;	 // Image of pixel regions
	CImg<unsigned int> RegionVector; // Vector pointing to parent regions
	CImg<unsigned int> COMs;		 // Center of Mass parameters

	CImgList<float> Centroids; // List of CCL Centroids and Hybrid Centroids

	float computationTime; // Time it took to calculate centroids

	// Functions
	Centroid();
	Centroid(int Width, int Height);
	void findRegions(std::vector<unsigned char>& Buffer, char* pMem, int pPitch);
	int getRegion(int X, int Y);
	int getParent(int Region);
	void reduceRegionCOMs();
	void reduceRegionImage();
	void CoMMethod(std::vector<unsigned char>& Buffer, char* pMem, int pPitch);
	void HGCMMethod(std::vector<unsigned char>& Buffer, char* pMem, int pPitch);
	void centroid(std::vector<unsigned char>& Buffer, char* pMem, int pPitch);
	void updateBuffer(std::vector<unsigned char>& Buffer, int X, int Y, int imageWidth, unsigned char pixValue);
};

// Initialize class
Centroid::Centroid()
{
	Centroids.assign(2);
}

// Initialize class with specified image size
Centroid::Centroid(int Width, int Height)
{
	Image.assign(Width, Height);
	Centroids.assign(2);
}

// Analyze image to find regions of neighboring lit pixels
void Centroid::findRegions(std::vector<unsigned char>& Buffer, char* pMem, int pPitch)
{
	// Image parameters
	int Width = Image.width();
	int Height = Image.height();

	// Create the necessary centroiding arrays
	//COMs.assign(1500, 4);
	COMs.fill(0); // Center of Mass parameters

	//RegionImage.assign(Width, Height);
	RegionImage.fill(0); // Image of each pixel's region number

	//RegionVector.assign(1500, 3); 	// Vector to keep track of region connectivity
	RegionVector.fill(0); 			// 1st element is the region that the i'th region points to
									// 2nd element is the region that points to the i'th region
									// 3rd element is the parent region (i.e. points to no region)
	// If two regions are equivalent, the region with the larger parent is appended to the end 
	// of the chain of the region with the smaller parent

	// Reset regions counter
	regions = 1;

	// Reset LED and Noise Intensity sums
	LEDIntensity = 0;
	LEDCount = 0;
	NoiseIntensity = 0;
	NoiseCount = 0;
	isLEDon = false;

	//printf("centroid2 - findRegions() - everything initialized \n");

	// Go through each pixel and add it to a region if sufficient intensity
	int regionNo;
	for (int Y = 1; Y < Height - 1; Y++)
	{
		//printf("centroid2 - findRegions() - row %d \n", Y);
		for (int X = 1; X < Width - 1; X++)
		{
			unsigned char pixValue = *(reinterpret_cast<char*>(pMem + X + Y*pPitch));
			Image(X, Y) = pixValue;

			updateBuffer(Buffer, X, Y, Width, pixValue);

			// Make sure we don't run out of memory
			if (regions >= RegionVector.width()) continue;
			//printf("centroid2 - findRegions() - col %d - regions: %d \n", X, regions);

			// Check if pixel is within Noise of LED areas
			if ((LEDyLowerBound <= Y && Y < LEDyUpperBound) && (LEDxLowerBound <= X && X < LEDxUpperBound)) {
				LEDIntensity += (int)pixValue;
				LEDCount++;
			}
			else if ((NoiseyLowerBound <= Y && Y < NoiseyUpperBound) && (NoisexLowerBound <= X && X < NoisexUpperBound)) {
				NoiseIntensity += (int)pixValue;
				NoiseCount++;
			}

			// Check if pixel is within centroiding AoI
			if ((yLowerBound <= Y && Y < yUpperBound) && (xLowerBound <= X && X < xUpperBound)) {
				// Make sure intensity is above noise threshold
				if (pixValue >= threshold)
				{
					regionNo = getRegion(X, Y);
					RegionImage(X, Y) = regionNo;
					//printf("centroid2 - findRegions() - regionNo %d \n", regionNo);

					COMs(regionNo, 0) += X * pixValue;
					COMs(regionNo, 1) += Y * pixValue;
					COMs(regionNo, 2) += pixValue;
					COMs(regionNo, 3)++;
				}
			}
		}
	}
}

// Get the region number of pixel (X,Y)
int Centroid::getRegion(int X, int Y)
{
	// A is the left pixel, B is the above pixel
	// If the region value is 0, the corresponding pixel was not lit
	int A = RegionImage(X - 1, Y);
	int B = RegionImage(X, Y - 1);

	// Find A,B's current parent region values
	int aParent = getParent(A);
	int bParent = getParent(B);

	//printf("A: %d, B: %d, aParent: %d, bParent: %d \n", A, B, aParent, bParent);

	int returnValue;
	
	if (A == B)
	{
		if (A == 0) // Both neighbors are unlit
		{ 
			regions++;
			returnValue = regions;
		}
		else // A and B are the same region
		{ 
			// Assign pixel to A's parent region
			returnValue = aParent;
		}
	}
	else if (aParent == bParent) // Both regions have same parent
	{
		// Assign pixel to A's parent region
		returnValue = aParent;
	}
	else if (aParent < bParent) // Add B's chain to end of A's chain
	{ 
		// First need to find end of A's chain
		int aEnd = RegionVector(A, 1);
		if (aEnd == 0) // A is the end
		{
			// Point bParent to A
			RegionVector(bParent, 0) = A;
		}
		else // Need to find the end
		{
			while (RegionVector(aEnd, 1) != 0) {
				aEnd = RegionVector(aEnd, 1);
			}
			// Point bParent to aEnd
			RegionVector(bParent, 0) = aEnd;
		}
		// Now make sure all of B's chain points to A's parent
		returnValue = getParent(bParent);
	}
	else // Add A's chain to end of B's chain
	{
		// First need to find end of B's chain
		int bEnd = RegionVector(B, 1);
		if (bEnd == 0) // B is the end
		{
			// Point aParent to B
			RegionVector(aParent, 0) = B;
		}
		else // Need to find the end
		{
			while (RegionVector(bEnd, 1) != 0) {
				bEnd = RegionVector(bEnd, 1);
			}
			// Point aParent to bEnd
			RegionVector(aParent, 0) = bEnd;
		}
		// Now make sure all of A's chain points to B's parent
		returnValue = getParent(aParent);
	}
	return returnValue;
}

// Make sure the listed parent region is correct
// Otherwise update RegionVector
int Centroid::getParent(int Region) {
	int Parent;
	if (RegionVector(Region, 0) != 0) {
		// This region points to another region, can't be a parent
		// Work forward to find parent
		Parent = RegionVector(Region, 0);
		while (RegionVector(Parent, 0) != 0) {
			Parent = RegionVector(Parent, 0);
		}
		// Now we have the parent. Work backwards and update equivalent regions
		int thisRegion = Parent;
		while (RegionVector(thisRegion, 1) != 0) {
			RegionVector(thisRegion, 2) = Parent;
			thisRegion = RegionVector(thisRegion, 1);
		}
		RegionVector(thisRegion, 2) = Parent; // Make sure the last region's parent is updated
		// Now the parents of all equivalent regions should be updated
	} else {
		// This region is the parent
		Parent = Region;
	}

	return Parent;
}

// Reduce Region CoM values to only parent regions
// (child regions will have 0 for all stored values)
void Centroid::reduceRegionCOMs() 
{
	for (int i = regions; i > 0; i--) // Go through RegionVector in reverse
	{
		if (RegionVector(i, 0) != 0) // Not a parent region
		{ 
			int parentRegion = RegionVector(i, 2);
			if (parentRegion == 0 || RegionVector(parentRegion, 0) != 0) // Actual parent not stored
			{
				parentRegion = getParent(i);
			}
			// Add values to parent region
			for (int k = 0; k < 4; k++)
			{ 
				COMs(parentRegion, k) += COMs(i, k);
				// Set child values to zero
				COMs(i, k) = 0;
			}
		}
	}
}

// Reduce Region Image to only parent regions
void Centroid::reduceRegionImage()
{
	// Must be done after centroid()
	for (int Y = 0; Y < Image.height(); Y++)
	{
		for (int X = 0; X < Image.width(); X++)
		{
			if (RegionImage(X, Y) != 0)
			{
				RegionImage(X, Y) = RegionVector(RegionImage(X, Y), 2);
			}
		}
	}
}

// ----- List of Centroiding Methods ----- //

// Find Center-of-Mass(Gravity) of each region in image
void Centroid::CoMMethod(std::vector<unsigned char>& Buffer, char* pMem, int pPitch) {
	CImg<float> CCLCenters(2500, 3); // (xCenter, yCenter, avgPixIntensity)
	CCLCenters.fill(0);
	int centroidCount = 0; // Keep track of number of centroids found

	// First find the regions in the image
	findRegions(Buffer, pMem, pPitch);
	//printf("centroid2 - CoMMethod() - regions found \n");
	reduceRegionCOMs();
	//printf("centroid2 - CoMMethod() - regions CoM reduced \n");
	reduceRegionImage();
	//printf("centroid2 - CoMMethod() - regions Image reduced \n");

	// For each region, find the center of mass
	for (int i = 0; i < regions; i++)
	{
		// Make sure we don't run out of memory
		if (centroidCount >= CCLCenters.width()) break;

		// Check that we're looking at a parent region
		if (COMs(i, 0) != 0)
		{
			int pixelCount = COMs(i, 3);
			// Check if region is too small
			if (pixelCount < minPix) {
				// Skip it
				continue;
			}
			// Check if region is too large (if applicable)
			if (pixelCount > maxPix) {
				// Skip it
				continue;
			}
			// Region is not too large, calculate CoM
			float xCOM = COMs(i, 0) / ((float)COMs(i, 2));
			float yCOM = COMs(i, 1) / ((float)COMs(i, 2));
			float avgPixIntensity = COMs(i, 2) / ((float)COMs(i, 3));

			// Add centroid to list
			CCLCenters(centroidCount, 0) = xCOM;
			CCLCenters(centroidCount, 1) = yCOM;
			CCLCenters(centroidCount, 2) = avgPixIntensity;
			centroidCount++;
		}
	}

	Centroids[0] = CCLCenters;
}

// Hybrid Gradient - CoM (HGCM) method
// (Finds gradient intensity for large regions, otherwise finds CoM)
void Centroid::HGCMMethod(std::vector<unsigned char>& Buffer, char* pMem, int pPitch) {
	CImg<float> HybridCenters(2500, 3); // (xCenter, yCenter, avgPixIntensity)
	HybridCenters.fill(0);
	int centroidCount = 0; // Keep track of number of centroids found

	// First get regions and find CoM for small regions
	CoMMethod(Buffer, pMem, pPitch);

	// Go through the regions that have too many pixels and use gradient method to find spot centers
	for (int i = 0; i < regions; i++) {
		// Check that the region is too large
		int pixelCount = COMs(i, 3);
		if (pixelCount < maxPix) {
			continue;
		}

		CImg<float> tempHybridCenters(100, 2);	// Need to keep track of all zero-crossings
												// If they are too close to each other, need to only keep one
		int tempHybridCount = 0;
		tempHybridCenters.fill(0);

		// Look at small window centered around CoM of region
		int windowSize = 40;
		int xCOM = COMs(i, 0) / COMs(i, 2); // This doesn't matter much so no need to worry
		int yCOM = COMs(i, 1) / COMs(i, 2); // about rounding errors

		int yStart = yCOM - windowSize / 2; int yEnd = yCOM + windowSize / 2;
		if (yStart < yLowerBound+1) yStart = yLowerBound+1;
		if (yEnd > yUpperBound-2) yEnd = yUpperBound-2;
		int xStart = xCOM - windowSize / 2; int xEnd = xCOM + windowSize / 2;
		if (xStart < xLowerBound+1) xStart = xLowerBound+1;
		if (xEnd > xUpperBound-2) xEnd = xUpperBound-2;

		for (int Y = yStart; Y < yEnd; Y++) {
			for (int X = xStart; X < xEnd; X++) {
				if (tempHybridCount >= tempHybridCenters.width()) break;
				// Make sure the pixel we're looking at is in the region we're looking at 
				int pixRegion = RegionImage(X, Y);
				if (RegionVector(pixRegion, 2) == i)
				{
					// Check if the gradient of intensity crosses zero
					// The equalities here are equivalent to checking if ddx(X) > 0 and ddx(X+1) <= 0 (etc)
					if (Image(X, Y+1) >= Image(X, Y-1) && Image(X, Y) > Image(X, Y+2)) {
						if (Image(X+1, Y) >= Image(X-1, Y) && Image(X, Y) > Image(X+2, Y)) {
							// Approximate derivative as line and calculate zero-crossing
							// (again, not actually using derivative but mathematically equivalent)
							float rootX = X + (Image(X+1,Y) - Image(X-1,Y)) / (1.0*(Image(X,Y) + Image(X+1,Y) - Image(X+2,Y) - Image(X-1,Y)));
							float rootY = Y + (Image(X,Y+1) - Image(X,Y-1)) / (1.0*(Image(X,Y) + Image(X,Y+1) - Image(X,Y+2) - Image(X,Y-1)));
							
							tempHybridCenters(tempHybridCount, 0) = rootX;
							tempHybridCenters(tempHybridCount, 1) = rootY;
							tempHybridCount++;
						}
					}
				}
			}
		}

		// Get rid of double-counted spots (i.e. nearby calculated centroids) and add to centroids list
		for (int k = 0; k <= tempHybridCount; k++)
		{
			if (centroidCount >= HybridCenters.width()) break;
			float Xk = tempHybridCenters(k, 0);
			float Yk = tempHybridCenters(k, 1);
			if (Xk == 0)
			{ 
				// Don't need to worry about these
				continue;
			}
			for (int l = k + 1; l <= tempHybridCount; l++)
			{
				float Xl = tempHybridCenters(l, 0);
				float Yl = tempHybridCenters(l, 1);
				if (Xl == 0)
				{ // Don't need to worry about these
					continue;
				}
				if (Xl - 1.5 < Xk && Xk < Xl + 1.5)
				{
					if (Yl - 1.5 < Yk && Yk < Yl + 1.5)
					{
						float pixL = Image(Xl, Yl);
						float pixK = Image(Xk, Yk); // Intensities of each pixel
						// Calculate weighted average of both centers
						float rootX = (pixL * Xl + pixK * Xk) / (pixL + pixK);
						float rootY = (pixL * Yl + pixK * Yk) / (pixL + pixK);
						// Update centerL and destroy centerK
						tempHybridCenters(k, 0) = rootX;
						tempHybridCenters(k, 1) = rootY;
						tempHybridCenters(l, 0) = 0;
						tempHybridCenters(l, 1) = 0;
					}
				}
			}
			// Add centers to list of centroids
			HybridCenters(centroidCount, 0) = tempHybridCenters(k, 0);
			HybridCenters(centroidCount, 1) = tempHybridCenters(k, 1);
			centroidCount++;
		}
	}

	Centroids[1] = HybridCenters;
}

void Centroid::centroid(std::vector<unsigned char>& Buffer, char* pMem, int pPitch)
{
	// Start calculation stopwatch
	Timer compute;

	if (UseHybridMethod) {
		HGCMMethod(Buffer, pMem, pPitch);
	} else {
		CoMMethod(Buffer, pMem, pPitch);
	}

	// Check if LED was on
	if ((LEDIntensity / LEDCount) > 2 * (NoiseIntensity / NoiseCount)) {
		isLEDon = true;
	}

	// Stop computation stopwatch
	computationTime = compute.end();
}

// Update the image buffer data
void Centroid::updateBuffer(std::vector<unsigned char>& Buffer, int X, int Y, int imageWidth, unsigned char pixValue)
{
	unsigned char pixMultiplier = 5;
	int dataIndex = 4 * (imageWidth * Y + X); // dataIndex + (0,1,2,3) == (R,G,B,A)
	if (255 - pixMultiplier*pixValue >= 0)
	{
		Buffer[dataIndex + 3] = 255 - pixMultiplier*pixValue;
	}
	else
	{
		Buffer[dataIndex + 3] = 0;
	}
}