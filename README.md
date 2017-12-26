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
