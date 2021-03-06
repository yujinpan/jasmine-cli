module.exports = function(grunt) {

    grunt.initConfig({
        testem: {
            unit: {
                options: {
                    framework: 'jasmine2',
                    launch_in_dev: ['PhantomJS'],
                    serve_files: [
                        'node_modules/lodash/lodash.js',
                        'node_modules/jquery/jquery.js',
                        'src/**/*.js',
                        'test/**/*.js'
                    ],
                    watch_files: [
                        'src/**/*.js',
                        'test/**/*.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-testem-mincer");

    grunt.registerTask("default", ['testem:run:unit']);

};