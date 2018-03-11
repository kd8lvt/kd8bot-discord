# Description
A Discord Bot with a level-up system, and Twitch integration!

You must host it yourself. Information on how to do this is provided below, in the "Hosting" section.

# Commands

Twitch Commands:

$playtwitch (twitch name)

    Plays the audio of the provided twitch streamer in the audio channel the command user is in.
    
$stoptwitch

    Stops playing twitch audio.
    
Leveling Commands:

$check xp

    Checks your XP.

# Hosting

Hosting Kd8Bot is simple enough. First, you need NodeJS and ffmpeg installed. As well as that, you need the dependencies for the project (as well as the project itself.)

To get NodeJS, go to www.nodejs.org

To get ffmpeg, go to www.ffmpeg.org/

To download the project, either clone the project as you normally would (development versions), download a zip (development versions), or download a release (stable versions).

Finally, to install the dependencies, open your command processor of choice, navigate to the folder you extracted/cloned Kd8Bot into, and type 'npm install' this will gather the required dependencies.

From here, you *have to configure the bot* it will not function if you don't configure it.

# Configuration

Configuring Kd8Bot is pretty simple. There is an example configuration (config.json) included with the bot. You just have to edit this file. It's got some pretty basic stuff for right now, but it will get better as time goes on, as I add stuff.

Setting up the Discord bot:
    Setting up the Discord bot is pretty simple. If you already know how to do this, or already have abot set up, feel free to skip this part.
    
   1. Head over to https://discordapp.com/developers/applications/me and log in, if you aren't already.
    
   2. Click the button that says "New App"
    
   4. Give your bot a name, description, and icon. Then click "Create App"
    
   4.5. If you don't see your bot's settings, click your bot to get to that page.
    
   5. Scroll down until you see "App Bot User" Click "create bot user" (or something similar) and then agree.
    
   6. Once you've done that, scroll back down, and click "Token: Click to Reveal" This is your bot's secret token. Don't give this to anyone! Put this in your config in the "discordSecret" option.

Setting up Twitch App:
    Setting up the Twitch side is even easier than setting up the Discord bot!
    
   1. Head over to https://dev.twitch.tv/dashboard and login if you need to.
    
   2. If you don't already have an app available, click "Register Your Application" otherwise, click "Apps" and then click "Register your Application"
   
   3. Fill out the information it asks for.
    
   4. Under the text "Client ID" there is a greyed-out textbox. This is your Twitch Secret. Put that in the config as the "twitchSecret" option.

After that, change the settings as you see fit.

# Starting up the bot

Once you have NodeJS and the dependencies installed, and have set up your configuration files, as well as the proper platform integrations, you are finally ready to start the bot. It's as simple as running the command `node bot` while in the same directory as the bot.js file.
