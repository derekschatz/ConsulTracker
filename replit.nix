{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.typescript-language-server
    pkgs.yarn
    pkgs.replitPackages.jest
    pkgs.lsof
    pkgs.python3
    pkgs.python310Packages.pip
    pkgs.curl
    pkgs.wget
  ];
} 