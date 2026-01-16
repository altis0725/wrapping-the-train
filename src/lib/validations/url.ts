/**
 * URL検証ユーティリティ
 * SSRF対策・XSS対策のための共通URL検証関数
 */

/**
 * ホスト名が内部/プライベートIPまたはメタデータエンドポイントかどうかを判定
 * SSRF対策: 内部ネットワークへのアクセスを遮断
 */
export function isInternalHost(hostname: string): boolean {
  const lowerHost = hostname.toLowerCase();

  // メタデータエンドポイント（AWS, GCP, Azure等）
  const metadataHosts = [
    "169.254.169.254",
    "metadata.google.internal",
    "metadata.gcp.internal",
  ];
  if (metadataHosts.includes(lowerHost)) {
    return true;
  }

  // DNSリバインディング/ワイルドカードDNSサービスを遮断
  const dnsRebindingPatterns = [
    ".nip.io",
    ".xip.io",
    ".sslip.io",
    ".localtest.me",
    ".lvh.me",
    ".vcap.me",
  ];
  if (dnsRebindingPatterns.some((p) => lowerHost.endsWith(p))) {
    return true;
  }

  // IPv6 ループバック/リンクローカル/ULA
  // 注: fc2.com 等の正当なドメインを誤ってブロックしないよう、
  // IPv6アドレスは ":" を含む場合のみ判定
  if (lowerHost.includes(":")) {
    if (
      lowerHost === "::1" ||
      lowerHost.startsWith("fe80:") ||
      lowerHost.startsWith("fc") ||
      lowerHost.startsWith("fd") ||
      lowerHost.startsWith("::ffff:")
    ) {
      return true;
    }
  }

  // プライベートIPレンジの検出（IPv4）
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lowerHost.match(ipv4Pattern);
  if (match) {
    const [, a, b] = match.map(Number);
    // 0.x.x.x, 10.x.x.x, 127.x.x.x, 169.254.x.x, 172.16-31.x.x, 192.168.x.x
    // 100.64-127.x.x (CGN), 198.18-19.x.x (ベンチマーク), 224-255.x.x.x (マルチキャスト/予約)
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && b >= 18 && b <= 19) ||
      a >= 224
    ) {
      return true;
    }
  }

  // localhost のバリエーション
  if (
    lowerHost === "localhost" ||
    lowerHost.endsWith(".localhost") ||
    lowerHost.endsWith(".local")
  ) {
    return true;
  }

  return false;
}

/**
 * 外部URLが安全かどうかを検証
 * SSRF/トラッキング防止のため、https スキームのみ許可し、内部IPを遮断
 */
export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // httpsスキームのみ許可（http、javascript、data等は拒否）
    if (parsed.protocol !== "https:") {
      return false;
    }
    // 内部ホスト/プライベートIPへのアクセスを遮断
    if (isInternalHost(parsed.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
