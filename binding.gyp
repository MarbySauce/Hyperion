{
	"targets": [
		{
			"target_name": "melexir",
			"sources": ["node_addons/melexir.cc"],
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
					"libraries": ["MaxEntAbel.lib"],
					"link_settings": {
						"library_dirs": [
							#"C:\\Users\\sevi\\Documents\\data_current\\MaxEntAbel\\DLL"
							"C:\\MaxEntAbel\\DLL"
						]
					},
					"include_dirs": [],
					"copies": [
						{
							"destination": "<(module_root_dir)/build/Release/",
							#"files": ["C:\\Users\\sevi\\Documents\\data_current\\MaxEntAbel\\DLL\\MaxEntAbel.dll"]
							"files": ["C:\\MaxEntAbel\\DLL\\MaxEntAbel.dll"]
						}
					],
					"msvs_settings": {
						"VCCLCompilerTool": {
							"ExceptionHandling": 1
						}
					}
				}],
				['OS=="mac"', {
					'xcode_settings': {
						'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
					},
					"libraries": ["/Users/Marty_1/Documents/Programming/MaxEntAbel/macOSX/MaxEntAbel.dylib"],
					"link_settings": {
						"library_dirs": ["/opt/X11/lib"] 
					},
					"include_dirs": [
						"/opt/X11/include"
					],
				}]
			]
		}
	]
}