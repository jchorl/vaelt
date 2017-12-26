# this only works with python 2.7
from pcapng import FileScanner
from pcapng.blocks import SectionHeader, InterfaceDescription, InterfaceStatistics


# two transfer directions
OUT = 0
IN = 1

# mapping from control vals to usb api
CONTROL_TRANSFER_TYPE_TO_USB_API = {
    0: 'standard',
    0x1: 'class'
}
CONTROL_TRANSFER_RECIPIENT_TO_USB_API = {
    0: 'device',
    0x1: 'interface'
}


# byte_array_str turns a bytearray into a str like "[0x12, 0x32...]"
def byte_array_str(barr):
    s = '['
    for b in barr[:-1]:
        s += '0x{:02X}, '.format(b)
    if len(barr) > 0:
        s += '0x{:02X}'.format(barr[-1])
    s += ']'
    return s

# magic starts here
with open('capture.pcapng') as fp:
    scanner = FileScanner(fp)
    for block in scanner:
        if isinstance(block, SectionHeader):
            continue
        if isinstance(block, InterfaceDescription):
            continue
        if isinstance(block, InterfaceStatistics):
            continue

        packet_payload = bytearray(block.packet_data)

        # figure out direction and endpoint
        direction = OUT if packet_payload[10] & 0b10000000 == 0 else IN
        endpoint = packet_payload[10] & 0b01111111

        # control transfers are 0x02
        if packet_payload[9] == 0x02:
            urb_req_type = packet_payload[40]
            urb_type = (urb_req_type & 0b01100000) / (2**5)
            urb_recipient = urb_req_type & 0b00011111
            value = packet_payload[43] * (16**2) + packet_payload[42]
            index = packet_payload[45] * (16**2) + packet_payload[44]
            if direction == OUT:
                # skip complete type because only submit matters when transfering out
                if packet_payload[8] == 0x43:
                    continue

                print(""".then(() => device.controlTransferOut({{
                    requestType: '{}',
                    recipient: '{}',
                    request: 0x{:02X},
                    value: 0x{:04X},
                    index: 0x{:04X}}}, Uint8Array.from({})))""").format(
                            CONTROL_TRANSFER_TYPE_TO_USB_API[urb_type],
                            CONTROL_TRANSFER_RECIPIENT_TO_USB_API[urb_recipient],
                            packet_payload[41],
                            value,
                            index,
                            byte_array_str(packet_payload[64:])
                            )
            else:
                # skip submit type because only complete matters when transfering in
                if packet_payload[8] == 0x53:
                    continue
                length = packet_payload[47] * (16**2) + packet_payload[46]
                print(""".then(() => device.controlTransferIn({{
                    requestType: '{}',
                    recipient: '{}',
                    request: 0x{:02X},
                    value: 0x{:04X},
                    index: 0x{:04X}}}, {}))""").format(
                            CONTROL_TRANSFER_TYPE_TO_USB_API[urb_type],
                            CONTROL_TRANSFER_RECIPIENT_TO_USB_API[urb_recipient],
                            packet_payload[41],
                            value,
                            index,
                            length
                            )
                print('.then(resp => console.log(resp))')

        # bulk transfers are 0x03
        if packet_payload[9] == 0x03:
            if direction == OUT:
                # skip complete type because only submit matters when transfering out
                if packet_payload[8] == 0x43:
                    continue

                print('.then(() => device.transferOut(0x{:02X}, Uint8Array.from({})))'.format(endpoint, byte_array_str(packet_payload[64:])))
            if direction == IN:
                # skip submit type because only complete matters when transfering in
                if packet_payload[8] == 0x53:
                    continue

                print('.then(() => device.transferIn(0x{:02X}, {}))'.format(endpoint, len(packet_payload) - 64))
                print('.then(resp => console.log(resp))')
