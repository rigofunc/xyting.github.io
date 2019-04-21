---
layout: default
title: TOTP算法应用场景及Java/C#实现
---

# HOTP & TOTP
OTP(One-Time Password)译为一次性密码，其基本认证思想是在认证双方共享密钥，并基于共享密钥对某一个事件计数并进行密码算法计算，做到一次一个动态密码，使用后作废，密码长度通常为6-8个数字，使用方便。所以是一种强认证技术，是增强目前静态口令认证的一种非常方便技术手段，是一种重要的双因素认证(2FA)技术。

[HOTP: An HMAC-Based One-Time Password Algorithm](https://tools.ietf.org/html/rfc4226)译为基于HMAC的一次性密码，其工作原理：**HTOP(S,C) = Truncate(HMAC-SHA-1(S,C))**
- **Truncate**：把HMAC-SHA-1哈希结果的20个字节转换成6-8位的数字；
- **S**: Secret，客户端和服务器事先协商好的共享密钥;
- **C**: Counter，客户端和服务器保持同步的计数器；

[TOTP: Time-Based One-Time Password Algorithm](https://tools.ietf.org/html/rfc6238)译为基于时间的一次性密码，是HOTP的一个变种，**因为HOTP有两个麻烦事，即需要共享一个密钥和同步一个计数器**，TOTP对同步计数器的麻烦事做了一个取巧，因为客户端和服务器天然就有一个时刻在变且*几乎*保持一致的时间，所以通过使用时间来做计数器，客户端和服务器就不用再同步一个计数器了。但使用时间做计数器，由于客户端和服务端之间通信会有网络延迟，导致两者用来计算一次性密码的时间不一致，所以TOTP中的**T = (Current Unix time - T0) / X**：
- CurrentUnixTime：当前的Unix时间;
- T0： 开始计步初始化时间，默认为0，即Unix Epoch;
- X : 步长，默认情况下为30s，即允许客户端和服务端之间通信会有网络延迟在30s以内；

# TOTP算法应用
TOTP算法广泛应用于各种互联网应用当中，以下是几个场景：
1. **动态验证码**，很多网站的动态验证码就是其中的一个例子，一般用来做2FA；
2. **扫码登录**，TOTP算法没有解决的一个问题就是客户端和服务端之间的共享密钥问题，我们可以通过把共享密钥也做成一个动态值，然后把动态密钥做成二维码，客户端通过扫码得到动态密钥，最后在客户端计算TOTP值发送给服务器。微信扫码、支付宝扫码就是这个算法的应用，也就是说，一般会用一个手机端的App；
3. **硬件TOKEN**，我们工卡上的硬件TOKEN，比如腾讯的TOKEN估计就是这个算法的应用；

# TOTP算法实现
# Java实现
```java
/*
 * Copyright (c) 2018-2019 yingtingxu(徐应庭). All rights reserved.
 */

package com.arch.totp;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;

/**
 * The implementation of TOTP: Time-Based One-Time Password Algorithm
 * <p>
 * see:
 * TOTP: https://tools.ietf.org/html/rfc6238
 */
public class Totp {
    public enum HashAlgorithm {
        HmacSHA1("HmacSHA1"), HmacSHA256("HmacSHA256"), HmacSHA512("HmacSHA512");

        private String name;

        HashAlgorithm(String name) {
            this.name = name;
        }

        public String getName() {
            return name;
        }

        @Override
        public String toString() {
            return getName();
        }
    }

    // default hash algorithm
    public static final HashAlgorithm DEFAULT_HASH_ALGORITHM = HashAlgorithm.HmacSHA1;

    // default time step in seconds
    public static final int DEFAULT_TIME_STEP = 30;

    // default number of digits
    public static final int DEFAULT_DIGITS = 8;

    // T0 is the Unix time to start counting time steps
    // (default value is 0, i.e., the Unix epoch)
    public static final int DEFAULT_T0 = 0;

    private static final int[] DIGITS_POWER
            // 0  1   2    3     4      5       6        7         8
            = {1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000};

    private int timeStep;
    private int t0;
    private int digits;
    private HashAlgorithm hashAlgorithm;

    private Totp(int timeStep, int t0, int digits, HashAlgorithm hashAlgorithm) {
        this.timeStep = timeStep;
        this.t0 = t0;
        this.digits = digits;
        this.hashAlgorithm = hashAlgorithm;
    }

    public static Totp newInstance() {
        return new Totp(
                DEFAULT_TIME_STEP,
                DEFAULT_T0,
                DEFAULT_DIGITS,
                DEFAULT_HASH_ALGORITHM);
    }

    public static Totp newInstance(
            int timeStep,
            int t0,
            int digits,
            HashAlgorithm hashAlgorithm) {
        return new Totp(timeStep, t0, digits, hashAlgorithm);
    }

    /**
     * This method generates a TOTP value for the given secret.
     *
     * @param secret: the shared secret, HEX encoded
     * @return: a numeric String in base 10 that includes truncated digits
     */
    public String generateTotp(String secret) {
        return generateTotp(secret, getCurrentTimeStepNumber());
    }

    /**
     * This method generates a TOTP value for the given secret.
     *
     * @param secret:         the shared secret, HEX encoded
     * @param timeStepNumber: the number of time step between the initial time T0 and the current unix time.
     * @return: a numeric String in base 10 that includes truncated digits
     */
    private String generateTotp(String secret, long timeStepNumber) {
        Assert.hasText(secret, "secret cannot be null or empty");

        // Using the counter
        // First 8 bytes are for the movingFactor
        // Compliant with base RFC 4226 (HOTP)
        byte[] timeStepBytes = ByteBuffer.allocate(8)
                .putLong(timeStepNumber)
                .array();
                
        // TODO: if the secret is HEX, not using UTF-8 encoding.
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);

        // the output would be a 20 byte long in RFC4226, see: https://tools.ietf.org/html/rfc4226
        byte[] hmacHash = getHmacSHA(secretBytes, timeStepBytes);

        // put selected bytes into result int
        int offset = hmacHash[hmacHash.length - 1] & 0xf;

        int truncatedHash = ((hmacHash[offset] & 0x7f) << 24) |
                ((hmacHash[offset + 1] & 0xff) << 16) |
                ((hmacHash[offset + 2] & 0xff) << 8) |
                (hmacHash[offset + 3] & 0xff);

        int otp = truncatedHash % DIGITS_POWER[digits];

        String result = Integer.toString(otp);
        while (result.length() < digits) {
            result = "0" + result;
        }
        return result;
    }

    /**
     * Validates the TOTP for the specified secret
     *
     * @param secret: the shared secret, HEX encoded
     * @param totp:   the TOTP generated by the secret
     * @return {@code true} if the TOTP is valid
     */
    public boolean validateTotp(String secret, String totp) {
        if (!StringUtils.hasText(secret) || !StringUtils.hasText(totp)) {
            return false;
        }

        // Allow a variance of no greater than 90 seconds in either direction
        long timeStepNumber = getCurrentTimeStepNumber();
        for (int i = -2; i <= 2; i++) {
            String totp2 = generateTotp(secret, timeStepNumber + i);
            if (totp.equals(totp2)) {
                return true;
            }
        }

        // No match
        return false;
    }

    private long getCurrentTimeStepNumber() {
        return (System.currentTimeMillis() / 1000L - t0) / timeStep;
    }

    /**
     * This method uses the JCE to provide the crypto algorithm.
     * HMAC computes a Hashed Message Authentication Code with the
     * crypto hash algorithm as a parameter.
     *
     * @param secretBytes: the bytes to use for the HMAC key
     * @param textBytes:   the message or text to be authenticated
     */
    private byte[] getHmacSHA(byte[] secretBytes, byte[] textBytes) {
        try {
            Mac hmac = Mac.getInstance(hashAlgorithm.getName());
            SecretKeySpec spec = new SecretKeySpec(secretBytes, "RAW");
            hmac.init(spec);
            return hmac.doFinal(textBytes);
        } catch (GeneralSecurityException gse) {
            throw new IllegalStateException(gse);
        }
    }
}
```

## C#实现
```csharp
// Copyright (c) 2018-2019 yingtingxu(徐应庭). All rights reserved.

using System;
using System.Diagnostics;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace Arch.Core
{
    /// <summary>
    /// https://tools.ietf.org/html/rfc6238
    /// </summary>
    public static class Totp
    {
        private static readonly DateTime _unixEpoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        private static TimeSpan _timestep = TimeSpan.FromSeconds(30);
        private static readonly Encoding _encoding = new UTF8Encoding(false, true);

        private static int ComputeTotp(HashAlgorithm hashAlgorithm, ulong timestepNumber, string modifier)
        {
            // # of 0's = length of pin
            const int Mod = 1000000;

            // See https://tools.ietf.org/html/rfc4226
            // We can add an optional modifier
            var timestepAsBytes = BitConverter.GetBytes(IPAddress.HostToNetworkOrder((long)timestepNumber));
            var hash = hashAlgorithm.ComputeHash(ApplyModifier(timestepAsBytes, modifier));

            // Generate DT string
            var offset = hash[hash.Length - 1] & 0xf;
            Debug.Assert(offset + 4 < hash.Length);
            var binaryCode = (hash[offset] & 0x7f) << 24
                             | (hash[offset + 1] & 0xff) << 16
                             | (hash[offset + 2] & 0xff) << 8
                             | (hash[offset + 3] & 0xff);

            return binaryCode % Mod;
        }

        private static byte[] ApplyModifier(byte[] input, string modifier)
        {
            if (string.IsNullOrEmpty(modifier))
            {
                return input;
            }

            var modifierBytes = _encoding.GetBytes(modifier);
            var combined = new byte[checked(input.Length + modifierBytes.Length)];
            Buffer.BlockCopy(input, 0, combined, 0, input.Length);
            Buffer.BlockCopy(modifierBytes, 0, combined, input.Length, modifierBytes.Length);
            return combined;
        }

        // More info: https://tools.ietf.org/html/rfc6238#section-4
        private static ulong GetCurrentTimeStepNumber()
        {
            var delta = DateTime.UtcNow - _unixEpoch;
            return (ulong)(delta.Ticks / _timestep.Ticks);
        }

        /// <summary>
        /// Generates TOTP for the specified <paramref name="securityToken"/>.
        /// </summary>
        /// <param name="securityToken">The security token to generate TOTP.</param>
        /// <param name="modifier">The modifier.</param>
        /// <returns>The generated code.</returns>
        public static int GenerateTotp(byte[] securityToken, string modifier = null)
        {
            if (securityToken == null)
            {
                throw new ArgumentNullException(nameof(securityToken));
            }

            // Allow a variance of no greater than 90 seconds in either direction
            var currentTimeStep = GetCurrentTimeStepNumber();
            using (var hashAlgorithm = new HMACSHA1(securityToken))
            {
                return ComputeTotp(hashAlgorithm, currentTimeStep, modifier);
            }
        }

        /// <summary>
        /// Validates the TOTP for the specified <paramref name="securityToken"/>.
        /// </summary>
        /// <param name="securityToken">The security token for verifying.</param>
        /// <param name="code">The TOTP to validate.</param>
        /// <param name="modifier">The modifier</param>
        /// <returns><c>True</c> if validate succeed, otherwise, <c>false</c>.</returns>
        public static bool ValidateTotp(byte[] securityToken, int code, string modifier = null)
        {
            if (securityToken == null)
            {
                throw new ArgumentNullException(nameof(securityToken));
            }

            // Allow a variance of no greater than 90 seconds in either direction
            var currentTimeStep = GetCurrentTimeStepNumber();
            using (var hashAlgorithm = new HMACSHA1(securityToken))
            {
                for (var i = -2; i <= 2; i++)
                {
                    var computedTotp = ComputeTotp(hashAlgorithm, (ulong)((long)currentTimeStep + i), modifier);
                    if (computedTotp == code)
                    {
                        return true;
                    }
                }
            }

            // No match
            return false;
        }

        /// <summary>
        /// Generates TOTP for the specified <paramref name="securityToken"/>.
        /// </summary>
        /// <param name="securityToken">The security token to generate code.</param>
        /// <param name="modifier">The modifier.</param>
        /// <returns>The generated code.</returns>
        public static int GenerateTotp(string securityToken, string modifier = null) => GenerateCode(Encoding.Unicode.GetBytes(securityToken), modifier);

        /// <summary>
        /// Validates the TOTP for the specified <paramref name="securityToken"/>.
        /// </summary>
        /// <param name="securityToken">The security token for verifying.</param>
        /// <param name="code">The code to validate.</param>
        /// <param name="modifier">The modifier</param>
        /// <returns><c>True</c> if validate succeed, otherwise, <c>false</c>.</returns>
        public static bool ValidateTotp(string securityToken, int code, string modifier = null) => ValidateCode(Encoding.Unicode.GetBytes(securityToken), code, modifier);
    }
}
```