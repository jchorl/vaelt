Chrome needs permissions to interact with the usb device:
sudo vim /etc/udev/rules.d/70-u2f.rules
SUBSYSTEM=="usb", ATTRS{idVendor}=="1050", MODE="0664", GROUP="plugdev"

Setting up yubikey:
docker run -it --rm --privileged yubikey
Follow this https://github.com/drduh/YubiKey-Guide
Use --full-gen-key instead of generate
Use gpg2
gpg2 --keyserver hkp://pool.sks-keyservers.net --send-key $KEYID
go to http://hkps.pool.sks-keyservers.net/ and search for your key id
click on the key id
use that url (e.g. http://hkps.pool.sks-keyservers.net/pks/lookup?op=get&search=0x40CAB1E55AD06662)

Enable touch-only mode:
apt-get install -y software-properties-common
apt-add-repository ppa:yubico/stable
apt-get update
apt-get install -y yubikey-manager
export LC_ALL=C.UTF-8
export LANG=C.UTF-8
ykman openpgp touch aut fixed
ykman openpgp touch enc fixed
ykman openpgp touch sig fixed
None of that actually worked, had to manually yolo install from https://developers.yubico.com/yubikey-manager/Releases/

Test it:
docker run -it --rm --privileged jac/gpg
gpg2 --card-edit
fetch
https://www.gnupg.org/gph/en/manual/x110.html

IMPORTANT RESOURCES
http://www.usb.org/developers/docs/devclass_docs/DWG_Smart-Card_CCID_Rev110.pdf
https://gnupg.org/ftp/specs/OpenPGP-smart-card-application-3.1.pdf
http://cardwerk.com/smart-card-standard-iso7816-4-section-6-basic-interindustry-commands/

Using Wireshark in docker for usb traffic:
On host, sudo modprobe usbmon
docker run -ti --rm --net=host --privileged -v $HOME:/root:ro -e XAUTHORITY=/root/.Xauthority -e DISPLAY=$DISPLAY manell/wireshark bash
apt-get update; apt-get install -y usbutils
wireshark
capture traffic
save it

Parse using python:
python-pcapng package is only python2
docker run -it --rm -v "$PWD":/work -w /work python:2.7 bash
pip install python-pcapng

Match that outputted js against the ccid spec and figure out which calls are necessary

Got stuck figuring out apdu/tpdu/etc.
docker run -it --rm --privileged jac/gpg bash
pcscd --foreground --debug --apdu --color | tee log.txt (https://ludovicrousseau.blogspot.ca/2011/07/pcscd-debug-output.html)
less -R log.txt
Found the call: APDU: 00 A4 00 0C 02 3F 00
so its apdu

Then I had to figure out how to get the public key
So I hit up the apdu spec: http://cardwerk.com/smart-card-standard-iso7816-4-section-6-basic-interindustry-commands/
The command of interest to get the public key (just the apdu): 00 CA 5F 50 00
This is a GET DATA request according to the spec
P1-P2 are 5F 50
From the spec, "When the value of P1-P2 lies in the range from '4000' to 'FFFF', the value of P1-P2 shall be a BER-TLV tag on two bytes. The values '4000' and 'FFFF' are RFU."
Perfect, so I grab the BER-TLV spec and start decoding: http://cardwerk.com/iso7816-4-annex-d-use-of-basic-encoding-rules-asn-1/
But that doesn't seem to be working at all, regardless of endianness
So I go back to the drawing board: gpg2 --card-status
In the results I see "URL of public key : <my public key url>"
Great, let's check out the gpg2 src and search for "URL of public key"
AH! "print_name (fp, "URL of public key : ", info.pubkey_url);"
rg pubkey_url
Nothing super useful :(
Let's check OpenSC
After a few greps, I grepped for URL and found "{ "URL",      "OPENPGP_URL",     "3F00:5F50",      NULL              },"
Wait, 5F50 looks very familiar, that was in the read command!!
Googling brought me to the openpgp spec https://gnupg.org/ftp/specs/openpgp-card-1.1.pdf
AH! 5F50 specifies to fetch the public URL. No BER-TLV after all (well not yet)





For decrypting, I wiresharked a decrypt
pcscd --foreground --debug --apdu --color > dec.log &
gpg2 --card-edit
fetch
gpg2 --encrypt --recipient jchorlton@gmail.com --output jac.gpg <(echo 'joshchorltonjoshchorltonjoshchorlton')
gpg2 --debug-all --output jac --decrypt jac.gpg
// new versions of gpg need --pinentry-mode loopback
I finally set up filters: usb.transfer_type!=0x01 && usb.data_len!=0


This proved to be quite unhelpful, I have no idea how to interpret the data coming back. I spent forever on this.
It looks like encrypted, compressed packets: https://tools.ietf.org/html/rfc4880#section-5.13

The device responds with the data encryption key

Alright, we're gdbing. Took a while to even set up an ubuntu image to compile gpg. But I docker committed it.
docker run -it --rm --privileged jchorl/gpgdebug
pcscd
gpg --card-edit
fetch
n
gpg --encrypt --recipient jchorlton@gmail.com --output jac.gpg <(echo 'joshchorltonjoshchorltonjoshchorlton')
gdb -tui gpg
set args --pinentry-mode loopback --output jac --decrypt jac.gpg
b g10/pubkey-enc.c:get_it
run

ok so the 111 byte message maps to buf in agent_pkdecrypt in call-agent.c
somehow ed becomes -19
ed = 11101101
19 = 00010011
theyre 2s compliment!!
okay, so now we know where buf comes from. now what happens next?

dek algo is the first byte, 9 in this case. thats CIPHER_ALGO_AES256!!!
the keylen is 32 (even though 35 bytes were returned)
the first is the algo, and the last 2 are the checksum
checksum is calculated as a u16, just adding all the key chars to it (find csum != csum2)
then the public key is checked for expiration or something

looks like were processing in proc_encrypted in mainproc.c
mainproc.c line 644 decrypt_data

apparently aes256 block size is 16 bytes (128 bit)
mdc (modification detection code) method is 2
looks like theres some meat happening at g10/decrypt-data.c:159
it appears to be CFB, AES256, 128 bit block size, with the DEK as the key, with no IV

I still dont know how they got a length of 87 in ed in decrypt-data.c:194

For some reason, they start reading the ciphertext at character 276, reading 18 chars

gpg2 --list-packets encrypted.gpg solves literally everything
Explanation: https://security.stackexchange.com/a/144555

Lets figure out our encrypted packets (https://www.ietf.org/rfc/rfc1991.txt section 6.5)
10 - normal CTB
0001 - public key encrypted packet
01 - 2 byte packet length field
85 - 10000101

packet length packets
010c - so this packet is 268 in length

03 - version 3 packet format

6cbf d96b 5600 155e - id of the key

01 - RSA

07 - I have no idea what this is

fe - length

...packets
