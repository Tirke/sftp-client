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

  it('should list the content of the directory', async () => {
    const list = await client.list('/samples')
    expect(list).toHaveLength(5)
  })

  it('should list properties like path, rights, name, type for files', async () => {
    const list = await client.list('/samples')
    const image = list.find(({ name }) => name === 'sample.jpg')
    expect(image).toEqual({
      name: 'sample.jpg',
      path: '/samples/sample.jpg',
      type: '-',
      owner: expect.any(Number),
      group: expect.any(Number),
      size: 36488,
      rights: { group: 'r', other: 'r', user: 'rw' },
      accessTime: expect.any(Number),
      modifyTime: expect.any(Number)
    })
  })

  it('should have time properties on files ready to be parsed with new Date()', async () => {
    const list = await client.list('/samples')
    const image = list.find(({ name }) => name === 'sample.jpg')

    if (!image) {
      throw new Error('Failed to find file in test')
    }

    expect(new Date(image.accessTime).toISOString()).toBeDefined()
  })
})
