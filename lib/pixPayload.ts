export function buildPixPayload({ key, name, city, amount, txid }: {
  key: string; name?: string; city?: string; amount?: number; txid?: string;
}) {
  const f = (id: string, val: string) => id + String(val.length).padStart(2, "0") + val;
  const gui = f("00", "BR.GOV.BCB.PIX");
  const keyField = f("01", key);
  const mai = f("26", gui + keyField);

  const merchantCat = f("52", "0000");
  const currency = f("53", "986");
  const amountField = amount ? f("54", amount.toFixed(2)) : "";
  const country = f("58", "BR");
  const nameField = f("59", (name || "RECEBEDOR").substring(0, 25));
  const cityField = f("60", (city || "SAO PAULO").substring(0, 15));
  const addData = f("62", f("05", (txid || "***").substring(0, 25)));

  let payload = f("00", "01") + mai + merchantCat + currency + amountField + country + nameField + cityField + addData;

  function crc16(s: string) {
    let crc = 0xffff;
    for (let i = 0; i < s.length; i++) {
      crc ^= s.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }
  const checksum = crc16(payload + "6304");
  return payload + "63" + "04" + checksum;
}
