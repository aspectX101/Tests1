using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace TweakerDisplays {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Device {
  public int cb;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string name;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string description;
  public int flags;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string id;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string key;
 }
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Mode {
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string device;
  public short spec, driver, size, extra;
  public int fields, x, y, orientation, fixedOutput;
  public short color, duplex, yResolution, ttOption, collate;
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=32)] public string form;
  public short logPixels;
  public int bits, width, height, flags, frequency, icmMethod, icmIntent, mediaType, ditherType, reserved1, reserved2, panningWidth, panningHeight;
 }
 public class Display {
  public string id, name;
  public bool primary;
  public int x, y, width, height, hz, maxHz;
  public Mode mode, maximum;
 }
 public static class Native {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool EnumDisplayDevices(string device, int index, ref Device output, int flags);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern bool EnumDisplaySettings(string device, int index, ref Mode mode);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int ChangeDisplaySettingsEx(string device, ref Mode mode, IntPtr hwnd, int flags, IntPtr param);
  [DllImport("user32.dll", CharSet=CharSet.Unicode, EntryPoint="ChangeDisplaySettingsExW")] static extern int Commit(string device, IntPtr mode, IntPtr hwnd, int flags, IntPtr param);
  static Mode Empty() { var m=new Mode(); m.size=(short)Marshal.SizeOf(typeof(Mode)); return m; }
  public static Display[] Read() {
   var result=new List<Display>();
   for(int i=0;;i++) {
    var d=new Device(); d.cb=Marshal.SizeOf(typeof(Device));
    if(!EnumDisplayDevices(null,i,ref d,0)) break;
    if((d.flags & 1)==0 || (d.flags & 8)!=0) continue;
    var m=Empty(); if(!EnumDisplaySettings(d.name,-1,ref m)) throw new Exception("display_read_failed");
    var monitor=new Device(); monitor.cb=Marshal.SizeOf(typeof(Device));
    string label=EnumDisplayDevices(d.name,0,ref monitor,0)?monitor.description:d.description;
    var best=m;
    for(int n=0;;n++) {
     var candidate=Empty(); if(!EnumDisplaySettings(d.name,n,ref candidate)) break;
     if(candidate.width==m.width && candidate.height==m.height && candidate.bits==m.bits && candidate.orientation==m.orientation && candidate.flags==m.flags && candidate.frequency>best.frequency) best=candidate;
    }
    best.x=m.x; best.y=m.y; best.fields |= 0x20;
    result.Add(new Display {id=d.name,name=label,primary=(d.flags&4)!=0,x=m.x,y=m.y,width=m.width,height=m.height,hz=m.frequency,maxHz=best.frequency,mode=m,maximum=best});
   }
   if(result.Count==0) throw new Exception("display_none");
   return result.ToArray();
  }
  static void Set(Display[] displays, Mode[] modes) {
   for(int i=0;i<displays.Length;i++) {
    var m=modes[i];
    if(ChangeDisplaySettingsEx(displays[i].id,ref m,IntPtr.Zero,0x10000001,IntPtr.Zero)!=0) throw new Exception("display_stage_failed");
   }
   if(Commit(null,IntPtr.Zero,IntPtr.Zero,0,IntPtr.Zero)!=0) throw new Exception("display_apply_failed");
  }
  public static int TestMode(string id, Mode mode) {
   return ChangeDisplaySettingsEx(id,ref mode,IntPtr.Zero,2,IntPtr.Zero);
  }
  public static bool Apply(Display[] displays, Mode[] modes, string title, string keep, string revert) {
   var previous=new Mode[displays.Length];
   for(int i=0;i<displays.Length;i++) {
    previous[i]=displays[i].mode; var m=modes[i];
    if(ChangeDisplaySettingsEx(displays[i].id,ref m,IntPtr.Zero,2,IntPtr.Zero)!=0) throw new Exception("display_mode_unsupported");
   }
   bool accepted=false;
   try {
    Set(displays,modes);
    using(var form=new Form()) using(var timer=new Timer()) {
     form.Text=title; form.Width=460; form.Height=170; form.TopMost=true; form.StartPosition=FormStartPosition.CenterScreen; form.FormBorderStyle=FormBorderStyle.FixedDialog; form.MaximizeBox=false; form.MinimizeBox=false;
     var label=new Label {Left=20,Top=20,Width=410,Height=40};
     var yes=new Button {Text=keep,Left=20,Top=75,Width=190,DialogResult=DialogResult.OK};
     var no=new Button {Text=revert,Left=225,Top=75,Width=190,DialogResult=DialogResult.Cancel};
     form.Controls.Add(label); form.Controls.Add(yes); form.Controls.Add(no); form.CancelButton=no; form.AcceptButton=no;
     int seconds=15; label.Text=title+" ("+seconds+" s)";
     timer.Interval=1000; timer.Tick+=(sender,e)=> { seconds--; label.Text=title+" ("+seconds+" s)"; if(seconds<=0) form.Close(); }; timer.Start();
     accepted=form.ShowDialog()==DialogResult.OK;
    }
   } finally {
    if(!accepted) { try {Set(displays,previous);} catch {throw new Exception("display_rollback_failed");} }
   }
   return accepted;
  }
 }
}
