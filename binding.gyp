{
	"targets": [
		{
			"target_name": "camera",
			"sources": [],
			"include_dirs": [
				"<!@(node -p \"require('node-addon-api').include\")",
				"./node_addons/include"
			],
			"dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
			"cflags": ["-std=c++11"],
			'cflags!': [ '-fno-exceptions'],
			'cflags_cc!': [ '-fno-exceptions' ],
			'conditions': [
				['OS=="win"', {
					"sources": ["node_addons/camera_win.cc"],
					"libraries": [ 
                        "uEye_api_64.lib",
                        "User32.lib"
                    ],
					"link_settings": {
						"library_dirs": [
							"C:\\Program Files\\IDS\\uEye\\Develop\\Lib",
                            "C:\\Program Files (x86)\\Windows Kits\\10\\Lib\\10.0.19041.0\\um\\x64"
						]
					},
					"include_dirs": [
						#"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.19041.0\\um",
						#"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.19041.0\\ucrt",
						#"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.19041.0\\shared",
						#"C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\BuildTools\\VC\\Tools\\MSVC\\14.29.30037\\include",
						"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.17763.0\\um",
						"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.17763.0\\ucrt",
						"C:\\Program Files (x86)\\Windows Kits\\10\\Include\\10.0.17763.0\\shared",
						"C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\BuildTools\\VC\\Tools\\MSVC\\14.16.27023\\include",
						"C:\\Program Files\\IDS\\uEye\\Develop\\include"
					],
                    "msvs_settings": {
                        "VCCLCompilerTool": {
                            "ExceptionHandling": 1
                        }
                    }
				}],
				['OS=="mac"', {
					"sources": ["node_addons/camera_mac.cc"],
					'xcode_settings': {
						'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
					},
					"link_settings": {
						"library_dirs": ["/opt/X11/lib"] 
					},
					"include_dirs": [
						"/opt/X11/include"
					]
				}]
			]
		},
		{
			"target_name": "wavemeter",
			"sources": [],
			"include_dirs": [
				"<!@(node -p \"require('node-addon-api').include\")",
				"./node_addons/include"
			],
			"dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
			"cflags": ["-std=c++11"],
			'cflags!': [ '-fno-exceptions'],
			'cflags_cc!': [ '-fno-exceptions' ],
			'conditions': [
				['OS=="win"', {
					"sources": ["node_addons/wavemeter_win.cc"],
					"libraries": ["wlmData.lib"],
					"link_settings": {
						"library_dirs": [
                            "C:\\Program Files (x86)\\HighFinesse\\Wavelength Meter WS5 3937\\Projects\\64"
						]
					},
					"include_dirs": [
						"C:\\Program Files (x86)\\HighFinesse\\Wavelength Meter WS5 3937\\Projects\\Headers\\C"
					],
                    "msvs_settings": {
                        "VCCLCompilerTool": {
                            "ExceptionHandling": 1
                        }
                    }
				}],
				['OS=="mac"', {
					"sources": ["node_addons/wavemeter_mac.cc"],
					'xcode_settings': {
						'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
					},
					"link_settings": {
						"library_dirs": ["/opt/X11/lib"] 
					},
					"include_dirs": [
						"/opt/X11/include"
					]
				}]
			]
		}
	]
}