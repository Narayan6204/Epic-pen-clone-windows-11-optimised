"""
Pen 11 — Single Instance Guard
Prevents multiple instances of the app from running simultaneously.
Uses QLocalServer/QLocalSocket for inter-process communication.
When a second instance is launched, it sends a WAKEUP message to the
already-running instance and then exits.
"""
from PyQt6.QtCore import QObject, pyqtSignal
from PyQt6.QtNetwork import QLocalServer, QLocalSocket

PIPE_NAME = 'Pen11_SingleInstance_v1'


class SingleInstanceGuard(QObject):
    """
    Call try_acquire() at startup.
    - Returns True if this is the primary (first) instance.
    - Returns False if another instance is already running (sends WAKEUP and should exit).
    
    Connect to the `wakeup` signal to be notified when a duplicate instance tries to launch.
    """
    wakeup = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._server = None

    def try_acquire(self) -> bool:
        """
        Attempt to become the primary instance.
        Returns True if successful, False if another instance already owns the lock.
        """
        # Try connecting to an existing server
        socket = QLocalSocket(self)
        socket.connectToServer(PIPE_NAME)
        if socket.waitForConnected(500):
            # Another instance is running — send WAKEUP and bail
            socket.write(b'WAKEUP')
            socket.waitForBytesWritten(1000)
            socket.disconnectFromServer()
            return False

        # No existing server — we are the primary instance
        # Remove stale socket file (e.g. after a crash)
        QLocalServer.removeServer(PIPE_NAME)

        self._server = QLocalServer(self)
        self._server.newConnection.connect(self._on_new_connection)
        if not self._server.listen(PIPE_NAME):
            # Failed to create server — allow the app to run anyway
            return True
        return True

    def _on_new_connection(self):
        """Handle incoming connection from a duplicate instance."""
        conn = self._server.nextPendingConnection()
        if conn:
            conn.waitForReadyRead(1000)
            data = bytes(conn.readAll()).decode('utf-8', errors='ignore')
            conn.disconnectFromClient()
            conn.deleteLater()
            if data.strip() == 'WAKEUP':
                self.wakeup.emit()
