const GoLogin = require('gologin')
const fs = require('fs')

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
    '--no-sandbox',
    '--no-zygote',
    '--window-position=0,0',
    `--window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT}`,
  ],
}

// console.log(gologinParams)
let GL = new GoLogin(gologinParams)

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

  const createOpts = {
    name: process.env.GOLOGIN_PROFILE_NAME || undefined,
    autoLang: true,
    lockEnabled: true,
    os: process.env.GOLOGIN_OS,
    folders: ['Generated'],
    navigator: {
      userAgent: process.env.GOLOGIN_USERAGENT,
      platform: process.env.GOLOGIN_PLATFORM,
      resolution: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`,
      language: process.env.GOLOGIN_LANGUAGE,
    },
    ...proxy,
  }
  // console.dir(createOpts)
  const profileId = await GL.create(createOpts)
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

  async function cleanup() {
    console.log('Cleaning up...')
    try {
      await GL.stop()
      if (profileId) {
        await GL.delete(profileId)
      }
      console.log('Cleanup completed')
      process.exit(0)
    } catch (error) {
      console.error('Error during cleanup:', error)
      process.exit(1)
    }
  }

  process.on('exit', cleanup)
  // Handle Docker stop signals
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
}

startBrowser()
