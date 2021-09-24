#include <math.h>
#include <vector>
#include "CImg.h"
#include "timer.h"

using namespace cimg_library;

class Centroid
{
public:
	int CCLCount;
	int HybridCount;			 // Count of centroided electrons
	unsigned int regions;		 // Number of different regions found
	unsigned int threshold = 20; // Lower limit of image signal / upper limit of image noise
	int minPix = 3;				 // Lower region bound to calculate center for
	int maxPix = 120;			 // Upper region bound to use CoM method

	bool ReduceRegionVector = true;		// Whether to reduce RegionVector to only point to parent region
	bool UseHybridMethod = true;		// Whether to use hybrid method

	CImg<unsigned int> Image;		 // Image to centroid
	CImg<unsigned int> RegionImage;	 // Image of pixel regions
	CImg<unsigned int> RegionVector; // Vector pointing to parent regions
	CImg<unsigned int> COMs;		 // Center of Mass parameters

	CImgList<float> Centroids; // List of CCL Centroids and Hybrid Centroids

	float computationTime; // Time it took to calculate centroids


	// Functions
	Centroid(int Width, int Height);
	float getddx(CImg<float> &Window, int X, int Y);
	float getddy(CImg<float> &Window, int X, int Y);
	void centroid(std::vector<unsigned char>& Buffer, char* pMem, int pPitch);
	int getRegion(int X, int Y);
	void reduceRegionVector();
	void calculateCentroids();
	void updateBuffer(std::vector<unsigned char>& Buffer, int X, int Y, int imageWidth, unsigned int pixValue);
};

// Initialize class
Centroid::Centroid(int Width, int Height)
{
	Image.assign(Width, Height);
	Centroids.assign(2);
}

// Calculate intensity gradient across row (for 1 pixel)
float Centroid::getddx(CImg<float> &Window, int X, int Y)
{
	int Im1 = Window(X - 1, Y);
	int Ip1 = Window(X + 1, Y);
	return 0.5 * (Ip1 - Im1);
}

// Calculate intensity gradient across column (for 1 pixel)
float Centroid::getddy(CImg<float> &Window, int X, int Y)
{
	int Im1 = Window(X, Y - 1);
	int Ip1 = Window(X, Y + 1);
	return 0.5 * (Ip1 - Im1);
}

void Centroid::centroid(std::vector<unsigned char>& Buffer, char* pMem, int pPitch)
{
	// Start calculation stopwatch
	Timer compute;

	// Image parameters
	int Width = Image.width();
	int Height = Image.height();

	// Create the necessary centroiding arrays
	//COMs.assign(250, 4);
	COMs.fill(0); // Center of Mass parameters


	//RegionImage.assign(Width, Height);
	RegionImage.fill(0);		 // Image of each pixel's region number

	//RegionVector.assign(250, 1); // Vector that contains each region's parent region
								 // The parent region is the lowest indexed of the equivalent regions

	// Properly fill RegionVector
	for (int i = 0; i < RegionVector.width(); i++)
	{
		RegionVector(i, 0) = i;
	}

	// Reset regions counter
	regions = 1;

	// Go through each pixel and add it to a region if sufficient intensity
	int regionNo;
	for (int Y = 1; Y < Height - 1; Y++)
	{
		for (int X = 1; X < Width - 1; X++)
		{
			//unsigned int pixValue = Image(X, Y);
			unsigned int pixValue = *(reinterpret_cast<unsigned char*>(pMem + X + Y*pPitch));
			Image(X, Y) = pixValue;

			updateBuffer(Buffer, X, Y, Width, pixValue);

			if (pixValue >= threshold)
			{
				regionNo = getRegion(X, Y);
				RegionImage(X, Y) = regionNo;

				COMs(regionNo, 0) += X * pixValue;
				COMs(regionNo, 1) += Y * pixValue;
				COMs(regionNo, 2) += pixValue;
				COMs(regionNo, 3)++;
			}
		}
	}

	if (ReduceRegionVector)
	{
		reduceRegionVector();
	}

	calculateCentroids();

	// Stop computation stopwatch
	computationTime = compute.end();
}

int Centroid::getRegion(int X, int Y)
{
	// A is the left pixel, B is the above pixel
	// If the region value is 0, the corresponding pixel was not lit
	unsigned int A = RegionImage(X - 1, Y);
	unsigned int B = RegionImage(X, Y - 1);

	// Find A,B's current parent region values
	while (A != RegionVector(A))
	{
		A = RegionVector(A);
	}
	while (B != RegionVector(B))
	{
		B = RegionVector(B);
	}

	int returnedRegionNo;
	if (X == 0 && Y == 0)
	{ // We're on the top left pixel, create new region
		regions++;
		returnedRegionNo = regions;
	}
	else if (X == 0 && Y != 0)
	{ // We're on the left edge, default to B or make new region
		if (B != 0)
		{
			returnedRegionNo = B;
		}
		else
		{
			regions++;
			returnedRegionNo = regions;
		}
	}
	else if (X != 0 && Y == 0)
	{ // We're on the top edge, default to A or make new region
		if (A != 0)
		{
			returnedRegionNo = A;
		}
		else
		{
			regions++;
			returnedRegionNo = regions;
		}
	}
	else
	{ // We're somewhere in the middle of the image
		if (A == B)
		{
			if (A == 0)
			{ // Both neighbors are unlit
				regions++;
				returnedRegionNo = regions;
			}
			else
			{ // A and B are the same region
				returnedRegionNo = A;
			}
		}
		else if (A > B)
		{
			if (B == 0)
			{ // Only A is lit
				returnedRegionNo = A;
			}
			else
			{ // Both are lit, default to lower region number (B)
				RegionVector(A) = B;
				returnedRegionNo = B;
			}
		}
		else
		{ // B > A
			if (A == 0)
			{ // Only B is lit
				returnedRegionNo = B;
			}
			else
			{ // Both are lit, default to lower region number (A)
				RegionVector(B) = A;
				returnedRegionNo = A;
			}
		}
	}
	return returnedRegionNo;
}

void Centroid::reduceRegionVector()
{
	for (unsigned int i = 1; i <= regions; i++)
	{
		while (RegionVector(i) != RegionVector(RegionVector(i)))
		{
			RegionVector(i) = RegionVector(RegionVector(i));
		}
	}
}

// Calculate the centroids of each spot
void Centroid::calculateCentroids()
{
	// Create the list containing the arrays of calculated centroids for each method
	// Centroids[0] is the centroids calculated using the Connected Component Labeling method
	// Centroids[1] is the centroids calculated using the hybrid method
	//Centroids.assign(2);
	CImg<float> CCLCenters(500, 2);
	CImg<float> HybridCenters(500, 2);
	CCLCenters.fill(0);
	HybridCenters.fill(0);


	// Reset electron counts
	CCLCount = 0;
	HybridCount = 0;

	// Find Center of Mass of parent regions
	for (unsigned int i = regions; i > 0; i--)
	{ // Go through RegionVector in reverse
		unsigned int regionNo = RegionVector(i);
		if (regionNo != i)
		{ // Not a parent region
			for (int k = 0; k < 4; k++)
			{ // Add values to parent region
				COMs(regionNo, k) += COMs(i, k);
			}
		}
		else
		{ // Parent region
			int xCOM = COMs(i, 0);
			int yCOM = COMs(i, 1);
			int norm = COMs(i, 2);
			int pixCount = COMs(i, 3);

			if ((pixCount > 3) && (pixCount <= maxPix))
			{ // Calculate CoM for spots of non-overlapping electrons
				CCLCenters(CCLCount, 0) = (1.0 * xCOM) / (1.0 * norm);
				CCLCenters(CCLCount, 1) = (1.0 * yCOM) / (1.0 * norm);
				CCLCount++;
			}
			else if (UseHybridMethod && pixCount > maxPix)
			{ // Calculate local maxima of spots of overlapping electrons
				int centerX = round((1.0 * xCOM) / (1.0 * norm));
				int centerY = round((1.0 * yCOM) / (1.0 * norm));

				// Create small window around spot to derive
				int smallWindowSize = 20; // size of each side of the small window
				CImg<float> smallWindow(smallWindowSize, smallWindowSize);
				smallWindow.fill(0);
				for (int Y = centerY - smallWindowSize / 2; Y < centerY + smallWindowSize / 2; Y++)
				{
					for (int X = centerX - smallWindowSize / 2; X < centerX + smallWindowSize / 2; X++)
					{
						if (Image(X, Y) >= threshold)
						{
							smallWindow(X - (centerX - smallWindowSize / 2), Y - (centerY - smallWindowSize / 2)) = Image(X, Y);
						}
					}
				}

				// Apply Gaussian blur to smallWindow to account for spots that saturate the camera
				// Essentially rounds-out the flat tops of these spots
				smallWindow.blur(1.0);

				CImg<float> tempHybridCenters(500, 2);
				tempHybridCenters.fill(0); // Need to keep track of all zero-crossings
										   // If they are too close to each other, need to only keep one
				int tempHybridCount = 0;

				// Find zero-crossings
				for (int Y = 2; Y < smallWindowSize - 2; Y++)
				{
					for (int X = 2; X < smallWindowSize - 2; X++)
					{
						unsigned int pixRegion = RegionImage(X + (centerX - smallWindowSize / 2), Y + (centerY - smallWindowSize / 2));
						if (RegionVector(pixRegion) == pixRegion)
						{ // We only need to look at pixels in the parent region
							// Get d(intenity)/dx and d(intensity)/dy of pixel and its neighbors
							float Xm1 = getddx(smallWindow, X - 1, Y);
							float X0 = getddx(smallWindow, X, Y);
							float Xp1 = getddx(smallWindow, X + 1, Y);
							float Ym1 = getddy(smallWindow, X, Y - 1);
							float Y0 = getddy(smallWindow, X, Y);
							float Yp1 = getddy(smallWindow, X, Y + 1);
							// Check if derivatives cross 0 between (X,Y)0 and (X,Y)p1
							if (Ym1 >= 0 && Y0 >= 0 && Yp1 < 0)
							{
								if (Xm1 > -0 && X0 >= 0 && Xp1 < 0)
								{
									// Calculate first-order approximation of zero-crossing
									// NOTE: look into using third-order approximation
									float rootX = (centerX - smallWindowSize / 2) + X + X0 / (X0 - Xp1);
									float rootY = (centerY - smallWindowSize / 2) + Y + Y0 / (Y0 - Yp1);
									tempHybridCenters(tempHybridCount, 0) = rootX;
									tempHybridCenters(tempHybridCount, 1) = rootY;
									tempHybridCount++;
								}
							}
						}
					}
				}

				// Get rid of double-counted spots (i.e. nearby calculated centroids) and add to HybridCenters
				for (int k = 0; k <= tempHybridCount; k++)
				{
					float Xk = tempHybridCenters(k, 0);
					float Yk = tempHybridCenters(k, 1);
					if (Xk == 0)
					{ // Don't need to worry about these
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
					// Add centers to HybridCenters
					HybridCenters(HybridCount, 0) = tempHybridCenters(k, 0);
					HybridCenters(HybridCount, 1) = tempHybridCenters(k, 1);
					HybridCount++;
				}
			}
		}
	}

	Centroids[0] = CCLCenters;
	Centroids[1] = HybridCenters;
}

// Update the image buffer data
void Centroid::updateBuffer(std::vector<unsigned char>& Buffer, int X, int Y, int imageWidth, unsigned int pixValue)
{
	int dataIndex = 4 * (imageWidth * Y + X); // dataIndex + (0,1,2,3) == (R,G,B,A)
	if (255 - 5*pixValue >= 0)
	{
		Buffer[dataIndex + 3] = 255 - 5*pixValue;
	}
	else
	{
		Buffer[dataIndex + 3] = 0;
	}
}