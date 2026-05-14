#!/usr/bin/env python3
import argparse
import select
import socket
import struct
import sys
import threading


def recv_exact(sock: socket.socket, size: int) -> bytes:
    chunks = []
    remaining = size
    while remaining:
        data = sock.recv(remaining)
        if not data:
            raise OSError("unexpected EOF")
        chunks.append(data)
        remaining -= len(data)
    return b"".join(chunks)


def socks5_upstream_connect(
    upstream_host: str,
    upstream_port: int,
    username: str,
    password: str,
    target_host: str,
    target_port: int,
) -> socket.socket:
    upstream = socket.create_connection((upstream_host, upstream_port), timeout=30)
    upstream.sendall(b"\x05\x01\x02")
    if recv_exact(upstream, 2) != b"\x05\x02":
        raise OSError("upstream socks5 auth negotiation failed")
    user = username.encode("utf-8")
    pwd = password.encode("utf-8")
    upstream.sendall(b"\x01" + bytes([len(user)]) + user + bytes([len(pwd)]) + pwd)
    if recv_exact(upstream, 2) != b"\x01\x00":
        raise OSError("upstream socks5 authentication failed")
    host_bytes = target_host.encode("idna")
    request = b"\x05\x01\x00\x03" + bytes([len(host_bytes)]) + host_bytes + struct.pack("!H", target_port)
    upstream.sendall(request)
    head = recv_exact(upstream, 4)
    if head[1] != 0x00:
        raise OSError(f"upstream socks5 connect failed: {head[1]}")
    atyp = head[3]
    if atyp == 0x01:
        recv_exact(upstream, 4)
    elif atyp == 0x03:
        size = recv_exact(upstream, 1)[0]
        recv_exact(upstream, size)
    elif atyp == 0x04:
        recv_exact(upstream, 16)
    else:
        raise OSError("upstream socks5 returned unknown address type")
    recv_exact(upstream, 2)
    return upstream


def relay(client: socket.socket, upstream: socket.socket) -> None:
    sockets = [client, upstream]
    while True:
        readable, _, _ = select.select(sockets, [], [], 60)
        if not readable:
            continue
        for sock in readable:
            data = sock.recv(65536)
            if not data:
                return
            other = upstream if sock is client else client
            other.sendall(data)


def parse_target(client: socket.socket) -> tuple[str, int]:
    version, command, _, atyp = recv_exact(client, 4)
    if version != 5 or command != 1:
        raise OSError("only socks5 CONNECT is supported")
    if atyp == 1:
        host = socket.inet_ntoa(recv_exact(client, 4))
    elif atyp == 3:
        host = recv_exact(client, recv_exact(client, 1)[0]).decode("idna")
    elif atyp == 4:
        host = socket.inet_ntop(socket.AF_INET6, recv_exact(client, 16))
    else:
        raise OSError("unsupported address type")
    port = struct.unpack("!H", recv_exact(client, 2))[0]
    return host, port


def handle_client(client: socket.socket, args: argparse.Namespace) -> None:
    upstream = None
    try:
        version, method_count = recv_exact(client, 2)
        if version != 5:
            raise OSError("invalid socks version")
        recv_exact(client, method_count)
        client.sendall(b"\x05\x00")
        target_host, target_port = parse_target(client)
        upstream = socks5_upstream_connect(
            args.upstream_host,
            args.upstream_port,
            args.username,
            args.password,
            target_host,
            target_port,
        )
        client.sendall(b"\x05\x00\x00\x01\x00\x00\x00\x00\x00\x00")
        relay(client, upstream)
    except Exception:
        try:
            client.sendall(b"\x05\x01\x00\x01\x00\x00\x00\x00\x00\x00")
        except Exception:
            pass
    finally:
        try:
            client.close()
        except Exception:
            pass
        if upstream is not None:
            try:
                upstream.close()
            except Exception:
                pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--listen-host", default="127.0.0.1")
    parser.add_argument("--listen-port", type=int, default=0)
    parser.add_argument("--upstream-host", required=True)
    parser.add_argument("--upstream-port", type=int, required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((args.listen_host, args.listen_port))
    server.listen(128)
    host, port = server.getsockname()
    print(f"READY {host}:{port}", flush=True)

    while True:
        client, _ = server.accept()
        thread = threading.Thread(target=handle_client, args=(client, args), daemon=True)
        thread.start()


if __name__ == "__main__":
    raise SystemExit(main())
