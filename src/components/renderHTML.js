import React from 'react';
import { Dimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

/**
 * Hàm renderHTML: Dùng để render HTML string trong bất kỳ screen nào.
 * @param {string} htmlString - Chuỗi HTML cần render
 * @param {number} [maxWidth] - Chiều rộng tối đa (mặc định là width màn hình)
 * @returns React element
 */
const renderHTML = (htmlString, maxWidth) => {
  const contentWidth = maxWidth || Dimensions.get('window').width - 40;
  return (
    <RenderHTML
      contentWidth={contentWidth}
      source={{ html: htmlString }}
      enableExperimentalMarginCollapsing={true}
      defaultTextProps={{ selectable: true }}
    />
  );
};

export default renderHTML;
