---
title: ArchLinuxインストールめも (2014)
date: 2014-10-06 00:51 JST
tags: Linux, ArchLinux, Maini7-3930k
---

どーもです.

メイン機のArchLinuxを再インストールをしたのでメモ.  
今回はUEFI-BootだとかBtrfsだとか, いろいろナウい感じにインストールしてみました.

## System Environment

* Intel Core i7-3930k
* Asus Rampage IV Formula (BIOS 4901)
* Geforce GTX 660 Ti
* 32GB RAM
* 256GB SSD
* 3TB HDD
* HHKB Lite 2 (US-Layout)

## Feature

* GPTなディスクでUEFI-Boot
* システムドライブにBtrfs
* Win10TPとDualBoot
* LightDM & Cinnamon

## Before Installation

* **Secure Bootを無効に**
* BIOSでUEFI-Firstに
* FastBootも一時的に切ったほうが良いかも

## Boot Arch Linux Disk

```
// 無線LANにつなぐ
# wifi-menu

# ping -c 3 www.archlinux.org
PING gudrun.archlinux.org (66.211.214.131) 56(84) bytes of data.
64 bytes from gudrun.archlinux.org (66.211.214.131): icmp_seq=1 ttl=44 time=217 ms
64 bytes from gudrun.archlinux.org (66.211.214.131): icmp_seq=2 ttl=44 time=213 ms
64 bytes from gudrun.archlinux.org (66.211.214.131): icmp_seq=3 ttl=44 time=215 ms

--- gudrun.archlinux.org ping statistics ---
3 packets transmitted, 3 received, 0% packet loss, time 2001ms
rtt min/avg/max/mdev = 213.972/215.602/217.699/1.602 ms

// ミラーサーバの設定
// jaistを一番上に
# vi /etc/pacman.d/mirrorlist
```

## Configure Partition

こんな感じにした

| Device | Capacity | Filesystem | Mountpoint | Memo |
| ------ | -------: | ---------- | ---------- | ---- |
| /dev/sda | 256GB |  |  | SSD |
| /dev/sda1 | 512MB | FAT32 | /boot/efi | ESP(EFI System Partition)ってやつ |
| /dev/sda2 | 64GB | Btrfs | / |  |
| /dev/sda3 | 64GB |  |  | もう一つOS入れる予定 |
| /dev/sda4 | 残り | NTF\*ckSystem |  | Win用 |
| /dev/sdb | 3TB |  |  | HDD |
| /dev/sdb1 | 1.5TB | EXT4 | /home |  |
| /dev/sdb2 | 50GB | EXT4 | /var | BOINCの関係でSSDとは別にした |
| /dev/sda3 | 500GB |  |  | 予備 |
| /dev/sdb4 | 残り | NTF\*ckSystem |  | ゴミFSに大事なデータなんて置けない |

```
// パーティション作成
# gdisk /dev/sda
# gdisk /dev/sdb

// フォーマット
# mkfs.vfat -F32 /dev/sda1
# mkfs.btrfs /dev/sda2
# mkfs.ext4 /dev/sdb1
# mkfs.ext4 /dev/sdb2

// マウント
# mount -o noatime,discard,ssd,autodefrag,compress=lzo,space_cache /dev/sda2 /mnt
# mkdir -p /mnt/boot/efi
# mount /dev/sda1 /mnt/boot/efi
# mkdir /mnt/home
# mount /dev/sdb1 /mnt/home
# mkdir /mnt/var
# mount /dev/sdb2 /mnt/var
```

## pacstrap

わかりやすいようにコマンド分けたけど, 一発でもおk

```
// base
# pacstrap /mnt base base-devel

// ブートローダ関係
# pacstrap /mnt grub efibootmgr

// ファイルシステム関係
# pacstrap /mnt dosfstools btrfs-progs lzo

// ネットワーク関係
# pacstrap /mnt openssh dialog wpa_supplicant

// その他
# pacstrap /mnt vim-python3 zsh git
```

## Configure New System

```
// fstab作る
# genfstab -p /mnt >> /mnt/etc/fstab
# echo 'tmpfs /tmp  tmpfs defaults,noatime,nosuid  0 0' >> /mnt/etc/fstab
# echo 'tmpfs /var/tmp  tmpfs defaults,noatime,nosuid  0 0' >> /mnt/etc/fstab
// /dev/sda*ではなくUUID=のように書き換える(fstab見ればわかる)
# vi /mnt/etc/fstab

// W-LAN接続の設定も持ってくる
# cp /etc/netctl/CONNECTION_CONFIG_FILE /mnt/etc/netctl/Kokoro-PyonPyon

// chroot!!!
# arch-chroot /mnt

// root password
(chroot)# passwd

// hostname
(chroot)# echo 'RabbitHouse' > /etc/hostname

// Timezone
(chroot)# ln -s /usr/share/zoneinfo/Asia/Tokyo /etc/localtime

// Locale
(chroot)# echo 'LANG=en_US.UTF-8' > /etc/locale.conf
(chroot)# sed -i 's/#en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen
(chroot)# locale-gen

// initramfs
// HOOKSのfsckの後ろにbtrfsを加える
(chroot)# vim /etc/mkinitcpio.conf
(chroot)# mkinitcpio -p linux

// gurbのインストール
(chroot)# mkdir /boot/efi/EFI
(chroot)# grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=Grub --recheck --debug
(chroot)# grub-mkconfig -o /boot/grub/grub.cfg

(chroot)# exit
# umount /mnt/{boot/efi,}
# reboot
```

再起動後はrootでログインし, `netctl start Kokoro-PyonPyon` すればW-LANでつながるはずです.

## pacman, makepkg.conf, yaourt

`/etc/pacman.conf` を開き, 以下をアンコメント.

```
Color

[multilib]
Include = /etc/pacman.d/mirrorlist
```

`/etc/makepkg.conf` の `ARCHITECTURE, COMPILE FLAGS` をこんな感じにした.

```shell
#########################################################################
# ARCHITECTURE, COMPILE FLAGS
#########################################################################
#
CARCH="x86_64"
CHOST="x86_64-unknown-linux-gnu"

#-- Compiler and Linker Flags
# -march (or -mcpu) builds exclusively for an architecture
# -mtune optimizes for an architecture, but builds for whole processor family
CPPFLAGS="-D_FORTIFY_SOURCE=2"
CFLAGS="-march=corei7-avx -O2 -pipe -fstack-protector --param=ssp-buffer-size=4"
CXXFLAGS="${CFLAGS}"
LDFLAGS="-Wl,-O1,--sort-common,--as-needed,-z,relro"
#-- Make Flags: change this for DistCC/SMP systems
MAKEFLAGS="-j12"
#-- Debugging flags
DEBUG_CFLAGS="-g -fvar-tracking-assignments"
DEBUG_CXXFLAGS="-g -fvar-tracking-assignments"
```

面倒だからスクリプト書いた.

```
# curl myon.info/data/install_yaourt.sh | bash
```

## Create User

```
// 個人用グループの作成
# groupadd chino

// ユーザの作成
# useradd -m -g chino -G wheel -s /bin/zsh chino

// パスワード
# passwd chino

// sudoersを弄ってwheelグループのユーザがsudoできるようにする
// 78行目あたりの "%wheel ALL=(ALL) NOPASSWD: ALL" をコメントアウト
# EDITOR=vim visudo
```

以後, このユーザsbで作業していきます.

## Window Manager

Geforce載んでるのでnvidiaを入れます.  
当然, 他のGPUを載んでいる場合は以下をコピペしても動きません.

Intelならxf86-video-intel, Radeonならcatalystで良いと思う.

```
// xorg
// libgl云々と聞かれたらnvidia-libglを選択
$ yaourt -Sy xorg-server xorg-server-utils xorg-server-xephyr xorg-utils nvidia

// Wacomペンタブ
$ yaourt -S xf86-input-wacom

// cinnamon
$ yaourt -S cinnamon

// lightdm
$ yaourt -S lightdm lightdm-gtk3-greeter
// 動作確認
$ lightdm --test-mode --debug

// GUI起動してもターミナルエミュレータがないからつらぽよ
$ yaourt -S lilyterm

// いろいろ必要
$ yaourt -S gnome-keyring

// サービスを有効に
$ sudo systemctl enable lightdm
$ sudo systemctl enable NetworkManager

// 再起動
$ sudo systemctl restart
```

これで再起動後LightDMのログイン画面やCinnamonが動くはずです.  
GUIが起動したあとはNetworkManagerを使ってインターネッツに接続すると便利です.

## Install Useful Softwares

以下をyaourtで入れていきます.

### Font

**フォント**は**ふぉんと(本当)**に大事.

* adobe-source-code-pro-fonts
* ttf-migu (AUR)

infinalityパッチを適用する. 設定はお好みで.

* fontconfig-infinality
* lib32-freetype2-infinality

### Browser

* chromium
* chromium-pepper-flash (AUR)
* firefox

### IME

fcitx入れるとCinnamon氏が勝手に自動起動の設定作ってくれるっぽいけど, `.xprofile` の設定はやってくれないようなので意味ない.

* fcitx-im
* fcitx-qt5
* fcitx-configtool
* fcitx-mozc

`.xprofile` はこんな感じ

```shell
export GTK_IM_MODULE=fcitx
export QT_IM_MODULE=fcitx
export XMODIFIERS="@im=fcitx"
export DefaultIMModule=fcitx
```

`.xinitrc` はこう.

```shell
#!/bin/sh
#
# ~/.xinitrc
#
# Executed by startx (run your window manager from here)

if [ -d /etc/X11/xinit/xinitrc.d ]; then
  for f in /etc/X11/xinit/xinitrc.d/*; do
    [ -x "$f" ] && . "$f"
  done
  unset f
fi
# Make sure this is before the 'exec' command or it won't be executed.
[ -f /etc/xprofile ] && . /etc/xprofile
[ -f ~/.xprofile ] && . ~/.xprofile
```

### xdg-user-dirs

`~/Music` とかのディレクトリを設定してくれる.  
インストール後 `xdg-user-dirs-update` すると各フォルダが `~/` に作成される.

* xdg-user-dirs

### Multimedia

* audacious
* audacity
* brasero
* gnome-mplayer
* sound-juicer

### Graphics

* blender
* calligra-krita
* gimp
* inkscape
* rawtherapee
* viewnior

### Office

evinceはPDF見るやつ.

* evince
* libreoffice-fresh

### Tools

便利.

* file-roller
* filezilla
* gnome-disk-utility
* gnome-system-monitor
* gparted
* nmap
* wireshark-gtk
* xsensors


### libvirt

### Programing

このPCはプログラム書くのに使うPCではないので必要最小限.  
Rubyとかは`vim-python3`入れた時に入ってるかも.

* boost
* clang
* ghc
* libc++
* qtcreater
* ruby

## Dual Boot