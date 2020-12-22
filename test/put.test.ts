import { getConnectedClient, closeConnectedClient, clearUpload } from './helpers'
import { SFTPClient } from '../src/client'
import { promises } from 'fs'

const { stat } = promises


describe('put', () => {
  let client: SFTPClient

  beforeAll(async () => {
    client = await getConnectedClient()
  })

  beforeEach(async () => clearUpload(client))

  afterAll(async () => {
    await closeConnectedClient(client)
  })

  it('should throw when sftp is not connected', async () => {
    const notConnectedClient = new SFTPClient()
    await expect(notConnectedClient.put('path', '/')).rejects.toThrow('No SFTP connection available')
  })

  it('put a file', async () => {
    const remote = '/upload/pic.jpg'
    const local = 'test/__fixtures__/samples/sample.jpg'
    const localStat = await stat(local)
    await client.put(local, remote)
    const list = await client.list('/upload')
    const remoteStat = await client.stat(remote)

    expect(list).toHaveLength(1)
    expect(localStat.size).toEqual(remoteStat.size)
  })

  it('should put a large file', async () => {
    console.log(await client.list('/upload'))
  })


})
