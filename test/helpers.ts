import { SFTPClient } from '../src/client'

const userPasswordConfig = {
  username: 'sftp',
  password: 'sftp',
  host: process.env.SFTP_HOST,
  port: 2222
}

export const getConnectedClient = async () => {
  const client = new SFTPClient()  
  await client.connect(userPasswordConfig)
  return client
}

export const closeConnectedClient = async (client: SFTPClient) => {
  return client.end()
}

export const clearUpload = async (client: SFTPClient) => {
  const all = await client.list('/upload')
  const exec = all.map(({ type, path }) => {
    if (type === 'd') {
      return client.rmdir(path, true)
    }

    return client.delete(path)
  })
  return Promise.all(exec)
}
