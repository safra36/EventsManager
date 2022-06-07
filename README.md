# EventsManager
Allows you to create scalable applications no matter where your app is running, built upon NodeJS net library

# Description
This project is created as a work for my university, i use this library in many of my projects already but today i officially released it for public use and i intend to provide support for the project in the future, there are still an unreleased part of the project which overtake the data size limitations the current version and is referred as `Extended Client` which means it's just an extention and nothing is changed, using that you will be able to transfer unlimited data between your applicaitons, this is not a data stream and a function ( which is an event on the other end ) is executed using the transferred data, adding data streams can be goal in future.

## Some features that can be added in future
- Pre Shared Key support for initial data encryption
- Adding Web Connection support using websocket (listener mod only, this will allow us to connect web and backend in a stright forward way)
- Extended Client release
- Server Multi-Threading support (Currently have not found a way since in cluster clients will seperate between threads and managing them is hard but possible)
- REAL p2p support using UDP Hole Punching (This will bring new challenges such as securtiy issues since DataGram sockets are not 2 way or not guranteed)
- TBA
