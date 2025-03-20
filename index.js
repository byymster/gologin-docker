const GoLogin = require('gologin')
const fs = require('fs')
const UAParser = require('ua-parser-js')

const SCREEN_WIDTH = process.env.SCREEN_WIDTH
const SCREEN_HEIGHT = process.env.SCREEN_HEIGHT
const CURRENT_INSTANCE_JSON =
  process.env.CURRENT_INSTANCE_JSON || '/opt/orbita/current-instance.json'

const gologinParams = {
  token: process.env.GOLOGIN_TOKEN,
  remote_debugging_port: 3500,
  executablePath: '/usr/bin/orbita-browser/chrome',
  extra_params: [
    '--start-maximized',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-sandbox',
    // '--no-zygote',
    '--window-position=0,0',
    `--window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT}`,
    // Prevent Chrome from closing
    '--disable-session-crashed-bubble',
    '--disable-infobars',
    '--persistent',
    '--no-default-browser-check',
    '--no-first-run',
    // These flags help with stability
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    // Keep browser open even after debugger detaches
    '--keep-alive'
  ],
}

// console.log(gologinParams)
const GLCreator = new GoLogin({ ...gologinParams, waitWebsocket: false })

async function startBrowser() {
  const proxy =
    process.env.GOLOGIN_PROXY_MODE && process.env.GOLOGIN_PROXY_MODE !== 'none'
      ? {
          proxyEnabled: true,
          proxy: {
            mode: process.env.GOLOGIN_PROXY_MODE,
            host: process.env.GOLOGIN_PROXY_HOST,
            port: process.env.GOLOGIN_PROXY_PORT,
            username: process.env.GOLOGIN_PROXY_USERNAME,
            password: process.env.GOLOGIN_PROXY_PASSWORD,
          },
        }
      : { proxyEnabled: false, proxy: { mode: 'none' } }

  const ua = new UAParser(process.env.GOLOGIN_USERAGENT)
  const createOpts = {
    name: process.env.GOLOGIN_PROFILE_NAME || 'Generated',
    autoLang: true,
    lockEnabled: true,
    // os: process.env.GOLOGIN_OS,
    folders: ['Generated'],
    fingerprint: {
      autoLang: true,
      resolution: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`,
    },
    navigator: {
      userAgent: process.env.GOLOGIN_USERAGENT,
      platform: ua.getOS().name,
      resolution: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`,
      language: process.env.GOLOGIN_LANGUAGE,
    },
    ...proxy,
  }
  const profileId = await GLCreator.create(createOpts)

  let GL
  let cleanupCalled = false
  function cleanup(exit = false) {
    return async () => {
      if (cleanupCalled) return
      cleanupCalled = true
      console.log('Cleaning up...')
      try {
        if (GL) {
          console.log('Stopping browser...')
          await GL.stop()
        }
        if (profileId) {
          console.log('Deleting profile...')
          await GLCreator.delete(profileId)
        }
        console.log('Cleanup completed')
        if (exit) {
          process.exit(0)
        }
      } catch (error) {
        console.error('Error during cleanup:', error)
        if (exit) {
          process.exit(1)
        }
      }
    }
  }
  process.on('exit', code => {
    console.log(`Process exiting with code: ${code}`)
  })
  // Handle Docker stop signals
  process.on('beforeExit', cleanup())
  process.on('SIGTERM', cleanup(true))
  process.on('SIGINT', cleanup(true))
  try {
    GL = new GoLogin({ ...gologinParams, profile_id: profileId })
    const { wsUrl } = await GL.start()
    const finalWsUrl = wsUrl
      .toString()
      .replace(
        '127.0.0.1:3500',
        `${process.env.GOLOGIN_HOST_NAME}:${process.env.GOLOGIN_HOST_PORT}`,
      )
    console.log('wsUrl', finalWsUrl)

    const currentInstance = {
      profileId,
      wsUrl: finalWsUrl,
    }

    fs.writeFileSync(CURRENT_INSTANCE_JSON, JSON.stringify(currentInstance))
  } catch (error) {
    console.error('Error starting GoLogin:', error)
    process.exit(1)
  }
}

startBrowser()
