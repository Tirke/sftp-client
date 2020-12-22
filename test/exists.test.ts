import { getConnectedClient, closeConnectedClient } from './helpers'
import { SFTPClient } from '../src/client'

describe('exists', () => {
  let client: SFTPClient

  beforeAll(async () => {
    client = await getConnectedClient()
  })

  afterAll(async () => {
    await closeConnectedClient(client)
  })

  it('should throw when sftp is not connected', async () => {
    const notConnectedClient = new SFTPClient()
    await expect(notConnectedClient.exists('path')).rejects.toThrow('No SFTP connection available')
  })

  it(`should return 'd' when used on an existing directory`, async () => {
    expect(await client.exists('/samples/test')).toEqual('d')
  })

  it('should return correctly when using relative paths', async () => {
    expect(await client.exists('/samples/test/../sample.jpg')).toEqual('-')
    expect(await client.exists('./samples/sample.json')).toEqual('-')
  })

  it(`should return '-' when used on an existing file`, async () => {
    expect(await client.exists('/samples/sample.json')).toEqual('-')
  })

  it(`should return '-' when used on a correct symlink`, async () => {
    expect(await client.exists('/samples/test/symlink.json')).toEqual('-')
  })

  it(`should return false when used on a broken symlink`, async () => {
    expect(await client.exists('/samples/test/broken-symlink')).toEqual(false)
  })

  it('should return false when used on an non existing directory', async () => {
    expect(await client.exists('/samples/not-existing')).toEqual(false)
  })
})
