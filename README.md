# SSH2 SFTP Client

This is an SFTP client for node.js written in TypeScript.
The whole thing is just a wrapper around [ssh2](https://github.com/mscdex/ssh2)  which provides a high level
convenience abstraction as well as a Promise based API.
This project is heavily inspired by [Theophilusx library](https://github.com/theophilusx/ssh2-sftp-client) but is written in TypeScript with less dependencies and a more modern style.

Documentation on the methods and available options in the underlying modules can
be found on the [ssh2](https://github.com/mscdex/ssh2) and [ss2-streams](https://github.com/mscdex/ssh2-streams/blob/master/SFTPStream.md) project pages.

Code is tested in integration only and against Node LTS versions. 
Node versions < 10.x are not supported.

# Install

`yarn add sftp-client-ts`

`npm i sftp-client-ts`

# Basic usage

```typescript
import { SFTPClient } from 'sftp-client-ts'

const client = new SFTPClient()
await client.connect({ host: '127.0.0.1', port: '8080', username: 'username', password: '******'})
const list = await client.list('/remote')
console.log(list) // => the detailed list of all files at /remote path
```

# Methods


