#include <string>

/**
 * @brief Get description of error code.
 *  Error codes taken from uEye.h 
 * 
 * @param ErrorCode - numeric error code value
 * @return std::string - description of error code
 */
std::string GetErrorFromCode(int ErrorCode) {
	switch (ErrorCode) {
		case -1: return "Function call failed"; break;
		case 0: return "Function success"; break;
		case 1: return "Invalid handle"; break;

		case 2: return "IO request failed"; break;
		case 3: return "Cannot open device"; break;
		case 4: return "Cannot close device"; break;
		case 5: return "Cannot set up memory"; break;
		case 6: return "No HWND for error report"; break;
		case 7: return "Error message not created"; break;
		case 8: return "Error string not found"; break;
		case 9: return "Hook not created"; break;
		case 10: return "Timer not created"; break;
		case 11: return "Cannot open registry"; break;
		case 12: return "Cannot read registry"; break;
		case 13: return "Cannot validate board"; break;
		case 14: return "Cannot give board access"; break;
		case 15: return "No image memory allocated"; break;
		case 16: return "Cannot clean up memory"; break;
		case 17: return "Cannot communicate with driver"; break;
		case 18: return "Function not supported yet"; break;
		case 19: return "Operating system not supported"; break;

		case 20: return "Invalid video input"; break;
		case 21: return "Invalid image size"; break;
		case 22: return "Invalid address"; break;
		case 23: return "Invalid video mode"; break;
        case 24: return "Invalid AGC mode"; break;
        case 25: return "Invalid gamma mode"; break;
        case 26: return "Invalid sync level"; break;
        case 27: return "Invalid CBARS mode"; break;
        case 28: return "Invalid color mode"; break;
        case 29: return "Invalid scale factor"; break;
        case 30: return "Invalid image size"; break;
        case 31: return "Invalid image position"; break;
        case 32: return "Invalid capture mode"; break;
        case 33: return "Invalid RISC program"; break;
        case 34: return "Invalid brightness"; break;
        case 35: return "Invalid contrast"; break;
        case 36: return "Invalid saturation U"; break;
        case 37: return "Invalid saturation V"; break;
        case 38: return "Invalid hue"; break;
        case 39: return "Invalid horizontal filter step"; break;
        case 40: return "Invalid vertical filter step"; break;
        case 41: return "Invalid EEPROM read address"; break;
        case 42: return "Invalid EEPROM write address"; break;
        case 43: return "Invalid EEPROM read length"; break;
        case 44: return "Invalid EEPROM write length"; break;
        case 45: return "Invalid board info pointer"; break;
        case 46: return "Invalid display mode"; break;
        case 47: return "Invalid error report mode"; break;
        case 48: return "Invalid bits per pixel"; break;
        case 49: return "Invalid memory pointer"; break;

        case 50: return "File write open error"; break;
        case 51: return "File read open error"; break;
        case 52: return "File read invalid BMP ID"; break;
        case 53: return "File read invalid BMP size"; break;
        case 54: return "File read invalid bit count"; break;
        case 55: return "Wrong kernel version"; break;

        case 60: return "RISC invalid X length"; break;
        case 61: return "RISC invalid Y length"; break;
        case 62: return "RISC exceed image size"; break;

        case 70: return "DirectDraw main failed"; break;
        case 71: return "DirectDraw primary surface failed"; break;
        case 72: return "DirectDraw screen size not supported"; break;
        case 73: return "DirectDraw clipper failed"; break;
        case 74: return "DirectDraw clipper HWND failed"; break;
        case 75: return "DirectDraw clipper connect failed"; break;
        case 76: return "DirectDraw back surface failed"; break;
        case 77: return "DirectDraw back surface in system memory"; break;
        case 78: return "DirectDraw MDL malloc error"; break;
        case 79: return "DirectDraw MDL size error"; break;
        case 80: return "DirectDraw clip no change"; break;
        case 81: return "DirectDraw primary memory null"; break;
        case 82: return "DirectDraw back memory null"; break;
        case 83: return "DirectDraw back overlay memory null"; break;
        case 84: return "DirectDraw overlay surface failed"; break;
        case 85: return "DirectDraw overlay surface in system memory"; break;
        case 86: return "DirectDraw overlay not allowed"; break;
        case 87: return "DirectDraw overlay color key error"; break;
        case 88: return "DirectDraw overlay not enabled"; break;
        case 89: return "DirectDraw get DC error"; break;
        case 90: return "DirectDraw DLL not loaded"; break;
        case 91: return "DirectDraw thread not created"; break;
        case 92: return "DirectDraw cannot get caps"; break;
        case 93: return "DirectDraw no overlay surface"; break;
        case 94: return "DirectDraw no overlay stretch"; break;
        case 95: return "DirectDraw cannot create overlay surface"; break;
        case 96: return "DirectDraw cannot update overlay surface"; break;
        case 97: return "DirectDraw invalid stretch"; break;

        case 100: return "Invalid event number"; break;
        case 101: return "Invalid mode"; break;
        case 102: return "Cannot find Falchook"; break;
        case 103: return "Cannot get hook proc address"; break;
        case 104: return "Cannot chain hook proc"; break;
        case 105: return "Cannot setup window proc"; break;
        case 106: return "HWND null"; break;
        case 107: return "Invalid update mode"; break;
        case 108: return "No active image memory"; break;
        case 109: return "Cannot initialize event"; break;
        case 110: return "Function not available in OS"; break;
        case 111: return "Camera not connected"; break;
        case 112: return "Sequence list empty"; break;
        case 113: return "Cannot add to sequence"; break;
        case 114: return "Low of sequence RISC memory"; break;
        case 115: return "Image memory to free used in sequence"; break;
        case 116: return "Image memory not in sequence list"; break;
        case 117: return "Sequence buffer already locked"; break;
        case 118: return "Invalid device ID"; break;
        case 119: return "Invalid board ID"; break;
        case 120: return "All devices busy"; break;
        case 121: return "Hook busy"; break;
        case 122: return "Timed out"; break;
        case 123: return "Null pointer"; break;
        case 124: return "Wrong hook version"; break;
        case 125: return "Invalid parameter"; break;
        case 126: return "Not allowed"; break;
        case 127: return "Out of memory"; break;
        case 128: return "Invalid while live"; break;
        case 129: return "Access violation"; break;
        case 130: return "Unknown ROP effect"; break;
        case 131: return "Invalid render mode"; break;
        case 132: return "Invalid thread context"; break;
        case 133: return "No hardware installed"; break;
        case 134: return "Invalid watchdog time"; break;
        case 135: return "Invalid watchdog mode"; break;
        case 136: return "Invalid passthrough in"; break;
        case 137: return "Error setting passthrough in"; break;
        case 138: return "Failure on setting watchdog"; break;
        case 139: return "No USB 2.0"; break;
        case 140: return "Capture running"; break;

        case 141: return "Memory board activated"; break;
        case 142: return "Memory board deactivated"; break;
        case 143: return "No memory board connected"; break;
        case 144: return "Too little memory"; break;
        case 145: return "Image not present"; break;
        case 146: return "Memory mode running"; break;
        case 147: return "Memory board disabled"; break;

        case 148: return "Trigger activated"; break;
        case 150: return "Wrong key"; break;
        case 151: return "CRC error"; break;
        case 152: return "Not yet released"; break;
        case 153: return "Not calibrated"; break;
        case 154: return "Waiting for kernel"; break;
        case 155: return "Not supported"; break;
        case 156: return "Trigger not activated"; break;
        case 157: return "Operation aborted"; break;
        case 158: return "Bad structure size"; break;
        case 159: return "Invalid buffer size"; break;
        case 160: return "Invalid pixel clock"; break;
        case 161: return "Invalid exposure time"; break;
        case 162: return "Auto exposure running"; break;
        case 163: return "Cannot create backbuffer surface"; break;
        case 164: return "Cannot create backbuffer mix"; break;
        case 165: return "Backbuffer overlay memory null"; break;
        case 166: return "Cannot create backbuffer overlay"; break;
        case 167: return "Not supported in overlay surface mode"; break;
        case 168: return "Invalid surface"; break;
        case 169: return "Surface lost"; break;
        case 170: return "Release backbuffer overlay DC"; break;
        case 171: return "Backbuffer timer not created"; break;
        case 172: return "Backbuffer overlay not enabled"; break;
        case 173: return "Only in backbuffer mode"; break;
        case 174: return "Invalid color format"; break;
        case 175: return "Invalid white balance binning mode"; break;
        case 176: return "Invalid I2C device address"; break;
        case 177: return "Could not convert"; break;
        case 178: return "Transfer error"; break;
        case 179: return "Parameter set not present"; break;
        case 180: return "Invalid camera type"; break;
        case 181: return "Invalid host IP high byte"; break;
        case 182: return "Color mode not supported in current display mode"; break;
        case 183: return "No IR filter"; break;
        case 184: return "Starter firmware upload needed"; break;

        case 185: return "DirectRender library not found"; break;
        case 186: return "DirectRender device out of memory"; break;
        case 187: return "DirectRender cannot create surface"; break;
        case 188: return "DirectRender cannot create vertex buffer"; break;
        case 189: return "DirectRender cannot create texture"; break;
        case 190: return "DirectRender cannot lock overlay surface"; break;
        case 191: return "DirectRender cannot unlock overlay surface"; break;
        case 192: return "DirectRender cannot get overlay DC"; break;
        case 193: return "DirectRender cannot release overlay DC"; break;
        case 194: return "DirectRender device capabilities insufficient"; break;
        case 195: return "Incompatible setting"; break;
        case 196: return "DirectRender not allowed while DC is active"; break;
        case 197: return "Device already paired"; break;
        case 198: return "Subnet mask mismatch"; break;
        case 199: return "Subnet mismatch"; break;
        case 200: return "Invalid IP configuration"; break;
        case 201: return "Device not compatible"; break;
        case 202: return "Network frame size incompatible"; break;
        case 203: return "Network configuration invalid"; break;
        case 204: return "Error CPU idle states configuration"; break;
        case 205: return "Device busy"; break;
        case 206: return "Sensor initialization failed"; break;
        case 207: return "Image buffer not DWORD aligned"; break;
        case 208: return "Sequence buffer is locked"; break;
        case 209: return "File path does not exist"; break;
        case 210: return "Invalid window handle"; break;
        case 211: return "Invalid image parameter"; break;
        case 212: return "No such device"; break;
        case 213: return "Device in use"; break;

		default: return "Unknown error code"; break;
	}
}