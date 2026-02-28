declare module 'react-native-share-menu' {
  export interface SharedItem {
    mimeType: string;
    data: string;
  }

  export interface ShareMenuListener {
    remove: () => void;
  }

  export function getInitialShare(
    callback: (item: SharedItem | null) => void
  ): void;

  export function addNewShareListener(
    callback: (item: SharedItem | null) => void
  ): ShareMenuListener;

  const ShareMenu: {
    getInitialShare: typeof getInitialShare;
    addNewShareListener: typeof addNewShareListener;
  };

  export default ShareMenu;
}
