import { getConnectedClient, closeConnectedClient } from './helpers'
import { SFTPClient } from '../src/client'

describe('realPath', () => {
  let client: SFTPClient

  beforeAll(async () => {
    client = await getConnectedClient()
  })

  afterAll(async () => {
    await closeConnectedClient(client)
  })

  it('should throw when sftp is not connected', async () => {
    const notConnectedClient = new SFTPClient()
    await expect(notConnectedClient.realPath('path')).rejects.toThrow('No SFTP connection available')
  })

  it('should resolve relative paths', async () => {
    expect(await client.realPath('/samples/test/../sample.jpg')).toEqual('/samples/sample.jpg')
  })

  it('should resolve . path', async () => {
    expect(await client.realPath('.')).toEqual('/')
  })

  it('should resolves . as the current working directory', async () => {
    expect(await client.cwd()).toEqual('/')
  })

  it('should resolves when files doesnt exist but directory doest', async () => {
    expect(await client.realPath('/samples/no-such-file.txt')).toEqual('/samples/no-such-file.txt')
  })

  it('should throw with error when directory path doesnt exists', async () => {
    await expect(client.realPath('/samples/no-dir/no-file.txt')).rejects.toThrow('No such file')
    await expect(client.realPath('/samples/no-dir/no-file.txt')).rejects.toHaveProperty('code', 2)
  })
})
