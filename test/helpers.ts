import { SFTPClient } from '../src/client'

const userPasswordConfig = {
  username: 'sftp',
  password: 'sftp',
  host: process.env.SFTP_HOST,
  port: Number.parseInt(process.env.SFTP_PORT ?? '2222', 10)
}

export const getConnectedClient = async () => {
  const client = new SFTPClient()
  console.log('connecting with ${}')
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
