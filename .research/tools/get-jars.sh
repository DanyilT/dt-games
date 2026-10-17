#!/bin/sh
# Bounce: downloads the eight Bounce JARs (Nokia's seven versions, and a port of 1.8) from archive.org's "J2ME Personal
# Archive" into a folder, and checks the zip and each JAR against its SHA-256. With a reference folder (the research's
# reference/), it also unzips 1.24 and copies its class files and resources there, ready for its build.sh.
#
#     get-jars.sh <folder> [reference folder]
set -e
DIR=${1:?usage: get-jars.sh <folder> [reference folder]}
REF=
if [ -n "$2" ]; then
    mkdir -p "$2"
    REF=$(cd "$2" && pwd) # Before this script moves to the JARs' folder
fi
URL=https://archive.org/download/j2me-hipnosis/Bounce.zip

mkdir -p "$DIR"
cd "$DIR"
[ -f Bounce.zip ] || curl -fL -o Bounce.zip "$URL"
echo "0f9b34da51ff81bc01cf8e41deea8b7d9876c746befed48373d9bfa77a575855  Bounce.zip" | shasum -a 256 -c -
unzip -o -q Bounce.zip
shasum -a 256 -c <<'EOF'
0c032fa4ae2a8e89627d41be703da1af6185c2aa4e3ece24372cc5173dc1f61d  Bounce [1.01] [LockedRes] [128x128] [En,Multi].jar
a9c4811a0720cd872acc17da7f65845de5d452094f489b7172f917b93675944b  Bounce [1.8] [LockedRes] [128x128] [En,Multi].jar
3d2ab60413ea94c913914ecd0f99640ad8a5a36ace2fe4478284b85fa6006633  Bounce [1.9] [LockedRes] [128x128] [En,Multi].jar
091afc45ee6231b4194dc0b29538bab4deea9cfda178bebed9dd70b3986db594  Bounce [1.12] [LockedRes] [128x128] [En,Multi].jar
53bb986a769eaf9dbef63c25910f50a2a420db550705e6917f15d51275db6ce2  Bounce [1.18] [LockedRes] [128x128] [En,Multi].jar
56dc233ee8769ac7f6805b5237ef440672edaec884ac006280bf19f06100b29c  Bounce [1.21] [LockedRes] [128x128] [En,Multi].jar
50d7779422b9496e3e50afe8acfa8a38af0f4a5b5873710324ab5fb2bb0fad50  Bounce [1.24] [LockedRes] [128x128] [En,Multi].jar
730b6581457e08c041bcda05ed7337d316243454b9b0026cb6cfd46c24d6dad5  Bounce [1.8] [LockedRes] [132x176] [En,Multi].jar
EOF

[ -n "$REF" ] || exit 0
rm -rf 1.24
unzip -o -q "Bounce [1.24] [LockedRes] [128x128] [En,Multi].jar" -d 1.24
mkdir -p "$REF/orig-classes" "$REF/res"
cp -R 1.24/com "$REF/orig-classes/"
cp -R 1.24/levels 1.24/icons 1.24/sounds 1.24/lang.* "$REF/res/"
echo "1.24's class files and resources are in $REF: run its build.sh"
