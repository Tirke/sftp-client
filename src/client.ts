import { EventEmitter } from 'events'
import { posix } from 'path'
import { promisify } from 'util'
import { Client, ConnectConfig, SFTPWrapper } from 'ssh2'
import { ReadStreamOptions } from 'ssh2-streams'

type DirectoryType = 'd'
type FileType = '-'
type LinkType = 'l'
type FileTypesValues = DirectoryType | FileType | LinkType

const enum FileTypes {
  File = '-',
  Link = 'l',
  Directory = 'd'
}

class SFTPError extends Error {
  code: string | number

  constructor(message: string, code: string | number) {
    super(message)
    this.code = code
  }
}

export class SFTPClient {
  public client = new Client()

  private endCalled = false

  remotePathSep = '/'

  remotePlatform = 'unix'

  private sftp?: SFTPWrapper = undefined

  private makeErrorListener() {
    return (err: string) => {
      throw new Error(err)
    }
  }

  private makeEndListener() {
    return () => {
      if (!this.endCalled) {
        this.sftp = undefined
        throw new Error('Connection ended unexpectedly')
      }
    }
  }

  private async getDirPath(path: string) {
    if (path.startsWith('..')) {
      const root = await this.realPath('..')
      return `${root}${this.remotePathSep}${path.substring(3)}`
    }

    if (path.startsWith('.')) {
      const root = await this.realPath('.')
      return `${root}${this.remotePathSep}${path.substring(2)}`
    }

    return path
  }

  async connect(config: ConnectConfig & { user?: string }) {
    return new Promise((resolve, reject) => {
      if (this.sftp) {
        reject(new Error('An existing SFTP connection is already defined'))
        return
      }

      this.client
      .on('ready', () => {
        this.client.sftp((e, SFTPWrapper) => {
          if (e) {
            reject(e)
            return
          }
          this.sftp = SFTPWrapper
          this.client.removeAllListeners('error')
          this.client.removeAllListeners('end')
          this.client.on('end', this.makeEndListener())
          this.client.on('error', this.makeErrorListener())
          this.sftp.realpath('.', (e, realPath) => {
            if (e) {
              const error = new SFTPError(`Failed to determine remote server type: ${e.message}`, e.code)
              reject(error)
              return
            }
            if (realPath.startsWith('/')) {
              this.remotePathSep = '/'
              this.remotePlatform = 'unix'
            } else {
              this.remotePathSep = '\\'
              this.remotePlatform = 'windows'
            }
          })
          resolve()
        })
      })
      .on('error', (e) => {
        removeListeners(this.client)
        reject(e)
      })
      .on('end', () => {
        reject(new Error('Connection ended unexpectedly by remote server'))
      })
      .connect(config)
    })
  }

  async end() {
    this.endCalled = true
    this.client.end()
    removeListeners(this.client)
    this.sftp = undefined
    this.endCalled = false
    return true
  }

  async realPath(path: string) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const realPath = promisify(this.sftp.realpath.bind(this.sftp))
    return realPath(path)
  }

  async cwd() {
    return this.realPath('.')
  }

  async list(path: string, filter: RegExp | string = /.*/) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const realPath = await this.realPath(path)
    const reg = /-/gi
    const readdir = promisify(this.sftp.readdir.bind(this.sftp))
    const list = (await readdir(realPath)).map(({ filename, longname, attrs: { uid, gid, size, mtime, atime } }) => {
      return {
        type: longname.substr(0, 1) as FileTypes,
        path: `${realPath}${this.remotePathSep}${filename}`,
        name: filename,
        size: size,
        modifyTime: mtime * 1000,
        accessTime: atime * 1000,
        rights: {
          user: longname.substr(1, 3).replace(reg, ''),
          group: longname.substr(4, 3).replace(reg, ''),
          other: longname.substr(7, 3).replace(reg, '')
        },
        owner: uid,
        group: gid
      }
    })
    let filterExpression: RegExp
    if (typeof filter === 'string') {
      filterExpression = new RegExp(filter.replace(/\*([^*])*?/gi, '.*'))
    } else {
      filterExpression = filter
    }

    return list.filter(({ name }) => filterExpression.test(name))
  }

  async exists(path: string): Promise<boolean | FileTypesValues> {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }
    const readdir = promisify(this.sftp.readdir.bind(this.sftp))
    try {

      const realPath = await this.realPath(path)
      const { dir, base } = posix.parse(realPath)

      if (!base) {
        return FileTypes.Directory
      }

      const files = await readdir(dir)
      const [type] = files.filter(({ filename }) => filename === base).map(({ longname }) => longname.substr(0, 1))
      return type as FileTypes || false
    } catch (e) {
      if (e.code === 2) {
        return false
      }
      throw e
    }
  }

  async mkdir(path: string, recursive = false) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const mkdir = promisify(this.sftp.mkdir.bind(this.sftp))
    const dirPath = await this.getDirPath(path)

    if (!recursive) {
      return mkdir(dirPath)
    }

    const { dir } = posix.parse(dirPath)
    const parent = await this.exists(dir)
    if (!parent) {
      await this.mkdir(dir, true)
    } else if (parent !== FileTypes.Directory) {
      throw new Error('Bad directory path')
    }
    return mkdir(dirPath)
  }

  async rename(fromPath: string, toPath: string) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const rename = promisify(this.sftp.rename.bind(this.sftp))
    const src = await this.realPath(fromPath)
    const dest = await this.getDirPath(toPath)
    return rename(src, dest)
  }

  async delete(path: string) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const unlink = promisify(this.sftp.unlink.bind(this.sftp))
    const realPath = await this.realPath(path)
    return unlink(realPath)
  }

  async createReadStream(path: string, opts: ReadStreamOptions) {
    if (!this.sftp) {
      throw new Error('No SFTP connection available')
    }

    const realPath = await this.realPath(path)
    return this.sftp.createReadStream(realPath, opts)
  }

  async listAndCleanEmptyFiles(path: string, filter = /.*/) {
    const all = await this.list(path, filter)
    const files = all.filter(content => content.type === FileTypes.File && content.size !== 0)
    const emptyFiles = all.filter(content => content.type === FileTypes.File && content.size === 0)
    await Promise.all(emptyFiles.map(({ path }) => this.delete(path)))
    return files
  }

}

function removeListeners(emitter: EventEmitter) {
  emitter.eventNames().forEach(name => emitter.removeAllListeners(name))
}
