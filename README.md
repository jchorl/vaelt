Chrome needs permissions to interact with the usb device:
sudo vim /etc/udev/rules.d/70-u2f.rules
SUBSYSTEM=="usb", ATTRS{idVendor}=="1050", MODE="0664", GROUP="plugdev"

Generating keys and getting them onto the device:
Build the docker image
Generate keys
https://www.yubico.com/support/knowledge-base/categories/articles/use-yubikey-openpgp/#generateopenpgp
make sure to choose to save the encryption key
gpg2 --list-keys
gpg2 --keyserver hkp://pool.sks-keyservers.net --send-key <PUB_KEY_ID>
gpg2 --card-edit
admin
url
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

Test it:
docker run -it --rm --privileged jac/gpg
gpg2 --card-edit
fetch
https://www.gnupg.org/gph/en/manual/x110.html

Using Wireshark in docker for usb traffic:
On host, sudo modprobe usbmon
docker run -ti --net=host --privileged -v $HOME:/root:ro -e XAUTHORITY=/root/.Xauthority -e DISPLAY=$DISPLAY manell/wireshark bash
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
