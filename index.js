const axios = require('axios').default
const withDNS = require('axios-with-dns')
const dns = require('node_dns_changer')

withDNS(axios)

// local DNS server package
const dns2 = require('dns2');
const { Packet } = dns2;

// for netfree adresess we will resolve DNS with google
const googleDNS = new dns2({ dns: '8.8.8.8', port: 53, recursive: true });

// local DNS server
const server = dns2.createServer({
  udp: true,
  recursive: true,
  handle: async (request, send, rinfo) => {
    const response = Packet.createResponseFromRequest(request);
    const [ question ] = request.questions;
    const { name } = question;
    if (name === 'netfree.link' || name.endsWith('.netfree.link')) {
      const DNSresult = await googleDNS.resolveA(name);
      response.answers = DNSresult.answers;
    }
    else {
      response.answers = [];
    }
    send(response);
  }
});
server.listen({ udp: 53 })

let internetStatus = true;

const disableInternet = async () => {
  await dns.setDNSservers({
    DNSservers: ['127.0.0.1']
  })
  internetStatus = false
  console.log('Internet disabled (except netfree URLs).')
}

const enableInternet = async () => {
  await dns.setDNSservers({
    DNSservers: ['8.8.8.8', '8.8.4.4']
  })
  internetStatus = true
  console.log('Internet enabled.')
}

const detectNetfree = async () => {
  const res = await axios.get('http://api.internal.netfree.link/user/0', { dnsServer: '8.8.8.8' }).catch(async err => {
    if (err.message == 'Timeout in making request') {
      detectNetfree()
    } else if (err.response?.status == 404) {
      if (internetStatus) {
        console.log('Disconnected from NetFree.')
        await disableInternet()
      }
    } else {
      console.log('Error:', err.message)
    }
  })
  if (res?.status == 200) {
    if (!internetStatus) {
      console.log('Connected to NetFree.')
      await enableInternet()
    }
  }
}
detectNetfree()

setInterval(detectNetfree, 1000)

server.on('listening', () => { console.log('local DNS server lauched 🚀') })

server.on('close', () => { console.log('local DNS server DOWN') })
