package com.ycms.school;

import android.Manifest;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattService;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothProfile;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

final class ThermalPrinter {

    private static final UUID SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private static final UUID BLE_SERVICE = UUID.fromString("000018f0-0000-1000-8000-00805f9b34fb");
    private static final UUID BLE_CHAR = UUID.fromString("00002af1-0000-1000-8000-00805f9b34fb");
    private static final String USB_ACTION = "com.ycms.school.USB_PERMISSION";
    private static final Handler UI = new Handler(Looper.getMainLooper());

    private ThermalPrinter() {}

    private static void toast(Context c, String m) {
        UI.post(() -> Toast.makeText(c, m, Toast.LENGTH_LONG).show());
    }

    private static boolean hasBtPerm(Context ctx) {
        if (Build.VERSION.SDK_INT < 31) return true;
        return ctx.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    static boolean printBluetooth(Context ctx, String address, byte[] data) {
        BluetoothAdapter adapter = btAdapter(ctx);
        if (adapter == null || !adapter.isEnabled()) {
            toast(ctx, "البلوتوث غير مفعّل — فعّله من الإعدادات");
            return false;
        }
        if (!hasBtPerm(ctx)) {
            toast(ctx, "امنح إذن الاتصال بالبلوتوث ثم أعد المحاولة");
            return false;
        }
        BluetoothDevice dev;
        try {
            dev = adapter.getRemoteDevice(address);
        } catch (Throwable e) {
            toast(ctx, "عنوان الطابعة غير صالح");
            return false;
        }
        try { adapter.cancelDiscovery(); } catch (Throwable ignored) {}

        String sppErr = null;
        try {
            if (printSpp(ctx, adapter, dev, data)) return true;
        } catch (Throwable e) {
            sppErr = e.getMessage();
        }

        try {
            if (printBle(ctx, dev, data)) return true;
        } catch (Throwable e) {

        }

        String msg = "فشل الاتصال بالطابعة: " + (sppErr != null ? sppErr : "غير متاحة");
        toast(ctx, msg);
        return false;
    }

    private static BluetoothAdapter btAdapter(Context ctx) {
        try {
            if (ctx instanceof MainActivity) return ((MainActivity) ctx).bridge.btAdapter();
            BluetoothManager bm = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
            return bm == null ? null : bm.getAdapter();
        } catch (Throwable t) {
            return null;
        }
    }

    private static boolean printSpp(Context ctx, BluetoothAdapter adapter, BluetoothDevice dev, byte[] data) throws Exception {
        BluetoothSocket sock = null;
        try {
            IOExceptionHolder holder = new IOExceptionHolder();
            sock = connectSpp(dev, holder);
            if (sock == null) throw new Exception(holder.msg != null ? holder.msg : "تعذر فتح قناة SPP");
            OutputStream os = sock.getOutputStream();
            writeChunked(os, data);
            os.flush();
            Thread.sleep(200);
            toast(ctx, "أُرسلت المهمة إلى الطابعة الحرارية");
            return true;
        } finally {
            if (sock != null) try { sock.close(); } catch (Throwable ignored) {}
        }
    }

    private static final class IOExceptionHolder {
        String msg;
    }

    private static BluetoothSocket connectSpp(BluetoothDevice dev, IOExceptionHolder holder) {
        BluetoothSocket s = null;
        try { s = dev.createRfcommSocketToServiceRecord(SPP); } catch (Throwable e) { holder.msg = e.getMessage(); }
        if (tryConnect(s, holder)) return s;
        try { s = dev.createInsecureRfcommSocketToServiceRecord(SPP); } catch (Throwable e) { if (holder.msg == null) holder.msg = e.getMessage(); }
        if (tryConnect(s, holder)) return s;

        try {
            Method m = dev.getClass().getMethod("createRfcommSocket", int.class);
            s = (BluetoothSocket) m.invoke(dev, 1);
        } catch (Throwable e) {
            if (holder.msg == null) holder.msg = e.getMessage();
        }
        if (tryConnect(s, holder)) return s;
        return null;
    }

    private static boolean tryConnect(BluetoothSocket sock, IOExceptionHolder holder) {
        if (sock == null) return false;
        try {
            sock.connect();
            return true;
        } catch (Throwable e) {
            if (holder != null) holder.msg = e.getMessage();
            try { sock.close(); } catch (Throwable ignored) {}
            return false;
        }
    }

    private static void writeChunked(OutputStream os, byte[] data) throws Exception {
        int chunk = 448;
        for (int i = 0; i < data.length; i += chunk) {
            int len = Math.min(chunk, data.length - i);
            os.write(data, i, len);
            os.flush();
            Thread.sleep(25);
        }
    }

    private static boolean printBle(Context ctx, BluetoothDevice dev, byte[] data) {
        final CountDownLatch latch = new CountDownLatch(1);
        final boolean[] done = { false };
        final String[] err = { null };
        final CountDownLatch[] writeAck = { null };

        BluetoothGattCallback cb = new BluetoothGattCallback() {
            @Override
            public void onConnectionStateChange(BluetoothGatt gatt, int status, int newState) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    try { gatt.discoverServices(); } catch (Throwable e) { err[0] = "فشل استكشاف الخدمات"; done[0] = false; latch.countDown(); }
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    if (!done[0] && err[0] == null) err[0] = "انقطع الاتصال بالطابعة";
                    latch.countDown();
                }
            }

            @Override
            public void onServicesDiscovered(BluetoothGatt gatt, int status) {
                try {
                    if (status != BluetoothGatt.GATT_SUCCESS) {
                        err[0] = "تعذر قراءة خدمات الطابعة";
                        latch.countDown();
                        return;
                    }
                    BluetoothGattCharacteristic ch = findPrintChar(gatt);
                    if (ch == null) {
                        err[0] = "لا تدعم الطابعة قناة الطباعة BLE";
                        latch.countDown();
                        return;
                    }
                    final BluetoothGattCharacteristic theCh = ch;
                    new Thread(() -> {
                        try {
                            boolean noResp = (theCh.getProperties() & BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE) != 0;
                            int chunk = 20;
                            int delay = noResp ? 8 : 30;
                            for (int i = 0; i < data.length; i += chunk) {
                                int len = Math.min(chunk, data.length - i);
                                byte[] part = new byte[len];
                                System.arraycopy(data, i, part, 0, len);
                                theCh.setValue(part);
                                theCh.setWriteType(noResp
                                        ? BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
                                        : BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);
                                if (!noResp) {

                                    final CountDownLatch w = new CountDownLatch(1);
                                    writeAck[0] = w;
                                    boolean ok = gatt.writeCharacteristic(theCh);
                                    if (!ok) throw new Exception("رفضت الطابعة البيانات");
                                    if (!w.await(4, TimeUnit.SECONDS)) throw new Exception("بطء استجابة الطابعة");
                                } else {
                                    boolean ok = gatt.writeCharacteristic(theCh);
                                    if (!ok) throw new Exception("رفضت الطابعة البيانات");
                                }
                                Thread.sleep(delay);
                            }
                            done[0] = true;
                        } catch (Throwable e) {
                            err[0] = e.getMessage() != null ? e.getMessage() : "خطأ إرسال BLE";
                        } finally {
                            latch.countDown();
                        }
                    }, "alkhabji-ble-writer").start();
                } catch (Throwable t) {
                    err[0] = t.getMessage();
                    latch.countDown();
                }
            }

            @Override
            public void onCharacteristicWrite(BluetoothGatt gatt, BluetoothGattCharacteristic characteristic, int status) {
                if (writeAck[0] != null) {
                    if (status != BluetoothGatt.GATT_SUCCESS && err[0] == null) err[0] = "فشل تأكيد كتابة BLE";
                    writeAck[0].countDown();
                }
            }
        };

        BluetoothGatt gatt = null;
        try {
            gatt = dev.connectGatt(ctx, false, cb, BluetoothDevice.TRANSPORT_LE);
            boolean finished = latch.await(14, TimeUnit.SECONDS);
            if (!finished) err[0] = err[0] != null ? err[0] : "انتهت مهلة الاتصال BLE";
        } catch (Throwable t) {
            if (err[0] == null) err[0] = t.getMessage();
        } finally {
            try { if (gatt != null) gatt.disconnect(); } catch (Throwable ignored) {}
            try { if (gatt != null) gatt.close(); } catch (Throwable ignored) {}
        }

        if (done[0]) {
            toast(ctx, "أُرسلت المهمة إلى الطابعة الحرارية (BLE)");
            try { Thread.sleep(150); } catch (Throwable ignored) {}
            return true;
        }
        return false;
    }

    private static BluetoothGattCharacteristic findPrintChar(BluetoothGatt gatt) {
        try {
            BluetoothGattService svc = gatt.getService(BLE_SERVICE);
            if (svc != null) {
                BluetoothGattCharacteristic ch = svc.getCharacteristic(BLE_CHAR);
                if (ch != null && (ch.getProperties() & (BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0) return ch;
                for (BluetoothGattCharacteristic c : svc.getCharacteristics()) {
                    if ((c.getProperties() & (BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0) return c;
                }
            }

            for (BluetoothGattService s : gatt.getServices()) {
                for (BluetoothGattCharacteristic c : s.getCharacteristics()) {
                    if ((c.getProperties() & (BluetoothGattCharacteristic.PROPERTY_WRITE | BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0) return c;
                }
            }
        } catch (Throwable ignored) {}
        return null;
    }

    static boolean printUsb(Context ctx, byte[] data) {
        try {
            UsbManager um = (UsbManager) ctx.getSystemService(Context.USB_SERVICE);
            if (um == null) { toast(ctx, "USB غير مدعوم على هذا الجهاز"); return false; }
            HashMap<String, UsbDevice> list = um.getDeviceList();
            UsbDevice printer = null;
            for (UsbDevice d : list.values()) {
                if (isPrinter(d)) { printer = d; break; }
            }
            if (printer == null) {
                toast(ctx, "لا توجد طابعة USB موصولة");
                return false;
            }
            if (!um.hasPermission(printer)) {
                PendingIntent pi = PendingIntent.getBroadcast(ctx, 0,
                        new Intent(USB_ACTION), PendingIntent.FLAG_IMMUTABLE);
                um.requestPermission(printer, pi);
                toast(ctx, "وافق على إذن الطابعة ثم أعد المحاولة");
                return false;
            }
            UsbInterface intf = printerInterface(printer);
            if (intf == null) { toast(ctx, "واجهة الطابعة غير مدعومة"); return false; }
            UsbDeviceConnection conn = um.openDevice(printer);
            if (conn == null) { toast(ctx, "تعذّر فتح قناة USB"); return false; }
            try {
                if (!conn.claimInterface(intf, true)) {
                    toast(ctx, "تعذّر حجز واجهة الطابعة");
                    return false;
                }
                UsbEndpoint out = bulkOut(intf);
                if (out == null) { toast(ctx, "نقطة إرسال الطابعة غير متاحة"); return false; }
                int chunk = 1024;
                for (int i = 0; i < data.length; i += chunk) {
                    int len = Math.min(chunk, data.length - i);
                    conn.bulkTransfer(out, data, i, len, 2000);
                    Thread.sleep(10);
                }
                toast(ctx, "أُرسلت المهمة إلى الطابعة الحرارية (USB)");
                return true;
            } finally {
                try { conn.releaseInterface(intf); } catch (Throwable ignored) {}
                try { conn.close(); } catch (Throwable ignored) {}
            }
        } catch (SecurityException se) {
            toast(ctx, "امنح إذن الطابعة USB ثم أعد المحاولة");
            return false;
        } catch (Throwable t) {
            toast(ctx, "خطأ طباعة USB: " + t.getMessage());
            return false;
        }
    }

    private static boolean isPrinter(UsbDevice d) {
        if (d.getDeviceClass() == 7) return true;
        for (int i = 0; i < d.getInterfaceCount(); i++) {
            if (d.getInterface(i).getInterfaceClass() == 7) return true;
        }
        return false;
    }

    private static UsbInterface printerInterface(UsbDevice d) {
        for (int i = 0; i < d.getInterfaceCount(); i++) {
            UsbInterface it = d.getInterface(i);
            if (it.getInterfaceClass() == 7) return it;
        }
        return d.getInterfaceCount() > 0 ? d.getInterface(0) : null;
    }

    private static UsbEndpoint bulkOut(UsbInterface it) {
        for (int i = 0; i < it.getEndpointCount(); i++) {
            UsbEndpoint e = it.getEndpoint(i);
            if (e.getDirection() == UsbConstants.USB_DIR_OUT && e.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK)
                return e;
        }
        for (int i = 0; i < it.getEndpointCount(); i++) {
            UsbEndpoint e = it.getEndpoint(i);
            if (e.getDirection() == UsbConstants.USB_DIR_OUT) return e;
        }
        return null;
    }
}
