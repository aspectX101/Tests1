using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

namespace Tweaker.Native {
    // Buffer contents are DWORDs, including cbSize. Works on x86 and x64.
    public static class Keyboard {
        [DllImport("user32.dll", EntryPoint="SystemParametersInfoW", SetLastError=true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool SystemParametersInfo(uint action, uint parameter, IntPtr data, uint flags);

        public static int[] Read(uint action, int words) {
            if (words != 1 && words != 2 && words != 6) throw new ArgumentOutOfRangeException("words");
            IntPtr buffer = Marshal.AllocHGlobal(words * 4);
            try {
                for (int i=0; i<words; i++) Marshal.WriteInt32(buffer, i*4, 0);
                if (words > 1) Marshal.WriteInt32(buffer, words * 4);
                if (!SystemParametersInfo(action, words > 1 ? (uint)(words * 4) : 0, buffer, 0))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
                int[] values = new int[words];
                Marshal.Copy(buffer, values, 0, words);
                return values;
            } finally { Marshal.FreeHGlobal(buffer); }
        }

        public static void WriteScalar(uint action, uint value) {
            // Persist the setting and broadcast WM_SETTINGCHANGE. No registry guessing.
            if (!SystemParametersInfo(action, value, IntPtr.Zero, 3))
                throw new Win32Exception(Marshal.GetLastWin32Error());
        }

        public static void WriteFlags(uint getAction, uint setAction, int words, int flags) {
            // Preserve all FilterKeys timing members; change only persistent flags.
            int[] values = Read(getAction, words);
            values[0] = words * 4;
            values[1] = flags;
            IntPtr buffer = Marshal.AllocHGlobal(words * 4);
            try {
                Marshal.Copy(values, 0, buffer, words);
                if (!SystemParametersInfo(setAction, (uint)(words * 4), buffer, 3))
                    throw new Win32Exception(Marshal.GetLastWin32Error());
            } finally { Marshal.FreeHGlobal(buffer); }
        }
    }
}
