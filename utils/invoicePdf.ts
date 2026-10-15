import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL, getAuthenticatedAccessToken } from './api';

export async function shareInvoicePdf(orderId: number) {
  const token = await getAuthenticatedAccessToken();
  if (!await Sharing.isAvailableAsync()) {
    throw new Error('Este dispositivo no puede abrir o compartir archivos PDF.');
  }

  const file = new File(Paths.cache, `bobiare-factura-${orderId}.pdf`);
  try {
    await File.downloadFileAsync(`${API_BASE_URL}/orders/${orderId}/invoice-pdf`, file, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
      idempotent: true,
    });
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: `Factura del pedido #${orderId}`,
    });
  } finally {
    if (file.exists) file.delete();
  }
}
