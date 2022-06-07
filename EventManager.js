






class EventsManager {

    static Events = {};
    static RepetetiveEvents = {};


    static listen = (eventName, func) => {
        EventsManager.Events[eventName] = func;
        
    }

    static repeat = (time, func) => {

        var timer = setInterval(() => {
            func();
        }, time);
        return () => {
            clearInterval(timer);
        }
    }



    static call = (eventName, ...args) => {
        if(EventsManager.Events[eventName] != undefined)
        {
            var func = EventsManager.Events[eventName];
            func(...args);
        }
        else
        {
            throw new Error(`Unknown event name: ${eventName}`)
        }
    }

    static callAsync = (eventName, ...args) => {
        return new Promise((res, rej) => {
            if(EventsManager.Events[eventName] != undefined)
            {
                var func = EventsManager.Events[eventName];
                res(func(...args));
            }
            else
            {
                rej(`Unknown event name: ${eventName}`)
            }
        })
        
    }

    static delete = (eventName) => {
        if(EventsManager.Events[eventName] != undefined)
        {
            delete EventsManager.Events[eventName];
        }
    }
}


module.exports = EventsManager;






















// EventsManager.listen("Bot:OnCommandWithParams", (chatid, command, arg1, arg2, arg3) => {
//     console.log(`ChatID: ${chatid} - Command: ${command} - Arg1: ${arg1} - Arg2: ${arg2} - Arg3: ${arg3}`)
// })

// var link = "/command arg1 arg2 arg3"
// console.log(link.split(/\s/))
// setTimeout(() => {
//     EventsManager.call('Bot:OnCommandWithParams', 231515, ...link.split(/\s/))
// }, 2000);